const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const fs = require("fs");
const isDev = require("electron-is-dev");

let serverProcess = null;

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

  const nodeModulesPath = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "node_modules"
  );

  return new Promise((resolve, reject) => {
    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath,
        APP_DATA_PATH: userData,
        PORT: "5000",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
      execArgv: [],
    });

    serverProcess.stdout?.on("data", (d) => console.log("[Server]", d.toString().trim()));
    serverProcess.stderr?.on("data", (d) => console.error("[Server]", d.toString().trim()));
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

    waitForServer("http://127.0.0.1:5000/")
      .then(resolve)
      .catch(reject);
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
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else if (serverError) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>JournalApp - Error</title></head>
<body style="font-family:system-ui,sans-serif;margin:2rem;max-width:560px;line-height:1.6;color:#333;">
  <h1 style="color:#c00;">Backend failed to start</h1>
  <p>The API server could not be started. The app cannot load data without it.</p>
  <p><strong>Error:</strong> ${String(serverError.message || serverError).replace(/</g, "&lt;")}</p>
  <p>Try closing and reopening the app. If the problem continues, check the logs or reinstall.</p>
</body>
</html>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorHtml));
  } else {
    const basePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
    mainWindow.loadFile(path.join(basePath, "out", "index.html"));
  }

  mainWindow.on("closed", () => {
    app.quit();
  });
}

app.whenReady().then(() => {
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
