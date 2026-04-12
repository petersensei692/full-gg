const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const fs = require("fs");
const fsp = fs.promises;
const { ensureBundledWindowsRootCert } = require("./windows-root-cert");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Dev mode when running unpackaged (e.g. npm run electron) */
const isDev = !app.isPackaged;

let serverProcess = null;
let appIsQuitting = false;
/** True while we are intentionally killing the forked API server (avoid false "crash" handling). */
let stoppingServerProcess = false;

function getOutDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "out")
    : path.join(__dirname, "..", "out");
}

/**
 * Next.js static export uses `out/<route>.html` (e.g. fundamental-analysis/asset.html).
 * Serving root index.html for deep URLs breaks the flight payload → white screen on reload / window.open.
 */
function joinUnderOutRoot(outRootResolved, posixRel) {
  const parts = posixRel
    .split("/")
    .filter(Boolean)
    .filter((p) => p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return path.join(outRootResolved, ...parts);
}

/**
 * Resolves a URL path to an on-disk file under `out/`.
 * - Extension paths (_next/*.js, .css, …): exact match only → null if missing (do not serve index.html as JS).
 * - Extensionless routes: Next `route.html`, then SPA fallback to index.html.
 */
function resolveAppProtocolFile(outDir, pathnameRaw) {
  const outRoot = path.resolve(outDir);
  let pathname = String(pathnameRaw || "").replace(/^\/+/, "");
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* keep */
  }
  pathname = pathname.split("?")[0].split("#")[0].replace(/\\/g, "/").replace(/\/+$/, "");

  const tryFile = (posixRel) => {
    const full = joinUnderOutRoot(outRoot, posixRel);
    if (!full) return null;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
    return null;
  };

  if (!pathname) {
    return tryFile("index.html") || path.join(outRoot, "index.html");
  }

  const lastSeg = pathname.split("/").pop() || "";
  const looksLikeFile = /\.[a-zA-Z0-9]{1,12}$/.test(lastSeg);

  const candidates = looksLikeFile
    ? [pathname, `${pathname}/index.html`]
    : [`${pathname}.html`, pathname, `${pathname}/index.html`];

  for (const c of candidates) {
    const hit = tryFile(c);
    if (hit) return hit;
  }

  if (looksLikeFile) return null;
  return path.join(outRoot, "index.html");
}

const APP_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function mimeForFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  return APP_MIME[ext] || "application/octet-stream";
}

ipcMain.handle("settings:choose-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Choose images directory",
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("settings:choose-database-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    title: "Choose SQLite database file",
    filters: [{ name: "SQLite database", extensions: ["db", "sqlite", "sqlite3"] }],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("settings:choose-database-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Choose folder for database",
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

/** @deprecated Use choose-database-file + choose-database-folder from the renderer. */
ipcMain.handle("settings:choose-database-path", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "openDirectory"],
    title: "Choose database file or folder",
    filters: [{ name: "SQLite database", extensions: ["db", "sqlite", "sqlite3"] }],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  const chosen = result.filePaths[0];
  try {
    const stat = fs.statSync(chosen);
    return { path: chosen, kind: stat.isDirectory() ? "directory" : "file" };
  } catch {
    return null;
  }
});

function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const http = require("http");
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error("Server failed to start"));
        } else {
          setTimeout(check, 300);
        }
      });
      req.on("error", () => {
        if (attempts >= maxAttempts) {
          reject(new Error("Server failed to start"));
        } else {
          setTimeout(check, 300);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error("Server failed to start"));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

function startServer() {
  if (!app.isPackaged) return Promise.resolve();

  const userData = app.getPath("userData");
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }

  const serverPath = path.join(process.resourcesPath, "server", "main.js");
  if (!fs.existsSync(serverPath)) {
    console.error("Server not found at", serverPath);
    return Promise.resolve();
  }

  const nodeModulesPath = path.join(process.resourcesPath, "server", "node_modules");

  return new Promise((resolve, reject) => {
    const stderrChunks = [];
    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath,
        APP_DATA_PATH: userData,
        PORT: "47391",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      execArgv: [],
    });

    serverProcess.stdout?.on("data", (d) => console.log("[Server]", d.toString().trim()));
    serverProcess.stderr?.on("data", (d) => {
      const s = d.toString();
      stderrChunks.push(s);
      console.error("[Server]", s.trim());
    });
    serverProcess.on("error", (err) => {
      console.error("Server spawn error:", err);
      reject(err);
    });
    serverProcess.on("exit", (code, signal) => {
      serverProcess = null;
      const intentional = stoppingServerProcess || appIsQuitting;
      stoppingServerProcess = false;
      if (code !== 0 && code !== null) {
        console.error("[Server] exited with code", code, signal || "");
      }
      if (
        app.isPackaged &&
        !intentional &&
        code !== 0 &&
        code !== null
      ) {
        try {
          dialog.showMessageBoxSync({
            type: "error",
            title: "JournalApp",
            message:
              "The journal data server stopped unexpectedly. API requests will not work until you fully quit and reopen the application.",
          });
        } catch {
          /* ignore */
        }
      }
    });

    waitForServer("http://127.0.0.1:47391/")
      .then(resolve)
      .catch(() => {
        const detail = stderrChunks.length ? stderrChunks.join("").trim().slice(-800) : "";
        const err = new Error("Server failed to start" + (detail ? `: ${detail}` : ""));
        reject(err);
      });
  });
}

const preloadPath = path.join(__dirname, "preload.js");

function attachPopupAndNavigationHandlers(webContents) {
  webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "app:") {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              webSecurity: true,
              preload: preloadPath,
            },
          },
        };
      }
      if (isDev && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
        const host = parsed.hostname;
        if (host === "localhost" || host === "127.0.0.1") {
          return {
            action: "allow",
            overrideBrowserWindowOptions: {
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: preloadPath,
              },
            },
          };
        }
      }
    } catch {
      /* ignore */
    }
    return { action: "deny" };
  });

  webContents.on("did-create-window", (childWindow) => {
    attachPopupAndNavigationHandlers(childWindow.webContents);
  });
}

function createWindow(serverError = null) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "JOURNAL APP",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: preloadPath,
    },
    show: false,
  });

  attachPopupAndNavigationHandlers(mainWindow.webContents);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3047");
  } else if (serverError) {
    const escape = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");
    const errorHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>JournalApp - Error</title></head>
<body style="font-family:system-ui,sans-serif;margin:2rem;max-width:560px;line-height:1.6;color:#333;">
  <h1 style="color:#c00;">Backend failed to start</h1>
  <p>The API server could not be started. The app cannot load data without it.</p>
  <p><strong>Error:</strong> ${escape(serverError.message || serverError)}</p>
  <p>Try closing and reopening the app. If the problem continues, check the logs or reinstall.</p>
</body>
</html>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorHtml));
  } else {
    mainWindow.loadURL("app://localhost/");
  }

  mainWindow.on("closed", () => {
    app.quit();
  });
}

app.whenReady().then(async () => {
  if (process.platform === "win32") {
    try {
      await ensureBundledWindowsRootCert(app);
    } catch (e) {
      console.error("[cert-trust] Unexpected error:", e);
    }
  }

  if (!isDev) {
    const outDir = getOutDir();
    const outDirResolved = path.resolve(outDir);
    protocol.handle("app", async (request) => {
      try {
        const url = new URL(request.url);
        const pathname = url.pathname || "/";
        const resolvedFile = resolveAppProtocolFile(outDir, pathname);
        if (!resolvedFile) {
          return new Response("Not Found", {
            status: 404,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        const resolvedAbs = path.resolve(resolvedFile);
        if (resolvedAbs !== outDirResolved && !resolvedAbs.startsWith(outDirResolved + path.sep)) {
          return new Response("Forbidden", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        const stat = await fsp.stat(resolvedAbs);
        if (!stat.isFile()) {
          return new Response("Not Found", {
            status: 404,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        const ct = mimeForFile(resolvedAbs);
        const p = pathname.replace(/^\/+/, "");
        const cache =
          p.startsWith("_next/static/") || pathname.startsWith("/_next/static/")
            ? "public, max-age=31536000, immutable"
            : "no-cache";
        if (request.method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Content-Length": String(stat.size),
              "Cache-Control": cache,
            },
          });
        }
        const body = await fsp.readFile(resolvedAbs);
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": ct,
            "Content-Length": String(body.length),
            "Cache-Control": cache,
          },
        });
      } catch (err) {
        console.error("[app protocol]", request.url, err);
        return new Response("Internal Server Error", {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    });
  }
  startServer()
    .then(() => createWindow(null))
    .catch((err) => {
      console.error("Failed to start server:", err);
      if (serverProcess) {
        stoppingServerProcess = true;
        serverProcess.kill();
      }
      createWindow(err);
    });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    stoppingServerProcess = true;
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  appIsQuitting = true;
  if (serverProcess) {
    stoppingServerProcess = true;
    serverProcess.kill();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (app.isPackaged && !serverProcess) {
      try {
        await startServer();
        createWindow(null);
      } catch (err) {
        console.error("Failed to restart server on activate:", err);
        createWindow(err);
      }
    } else {
      createWindow(null);
    }
  }
});
