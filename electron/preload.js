const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  chooseDirectory: () => ipcRenderer.invoke("settings:choose-directory"),
  chooseDatabaseFile: () => ipcRenderer.invoke("settings:choose-database-file"),
});
