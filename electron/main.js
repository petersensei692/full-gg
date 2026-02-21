const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");

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

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
  } else {
    // Packaged: out is in resources or next to app; dev run with electron .: out is ../out
    const basePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
    mainWindow.loadFile(path.join(basePath, "out", "index.html"));
  }

  mainWindow.on("closed", () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
