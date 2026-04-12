const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const { fork } = require("child_process");
const fs = require("fs");
const { ensureBundledWindowsRootCert } = require("./windows-root-cert");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Dev mode when running unpackaged (e.g. npm run electron) */
const isDev = !app.isPackaged;

let serverProcess = null;

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

function resolveExportedHtmlPath(outDir, pathnameRaw) {
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

  const candidates = [
    pathname,
    `${pathname}.html`,
    `${pathname}/index.html`,
  ];

  for (const c of candidates) {
    const hit = tryFile(c);
    if (hit) return hit;
  }

  return path.join(outRoot, "index.html");
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
    serverProcess.on("exit", (code) => {
      serverProcess = null;
      if (code !== 0 && code !== null) {
        console.error("Server exited with code", code);
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
    protocol.handle("app", (request) => {
      const url = new URL(request.url);
      const pathname = url.pathname || "/";
      const outDirResolved = path.resolve(outDir);
      const resolved = resolveExportedHtmlPath(outDir, pathname);
      if (!resolved.startsWith(outDirResolved + path.sep) && resolved !== outDirResolved) {
        return net.fetch(pathToFileURL(path.join(outDir, "index.html")).href);
      }
      return net.fetch(pathToFileURL(resolved).href);
    });
  }
  startServer()
    .then(() => createWindow(null))
    .catch((err) => {
      console.error("Failed to start server:", err);
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      createWindow(err);
    });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(null);
  }
});
