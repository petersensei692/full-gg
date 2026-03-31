const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  chooseDirectory: () => ipcRenderer.invoke("settings:choose-directory"),
  chooseDatabaseFile: () => ipcRenderer.invoke("settings:choose-database-file"),
  chooseDatabaseFolder: () => ipcRenderer.invoke("settings:choose-database-folder"),
  /** Returns `{ path, kind: 'file' | 'directory' }` or `null`. */
  chooseDatabasePath: () => ipcRenderer.invoke("settings:choose-database-path"),
});
