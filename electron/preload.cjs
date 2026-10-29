const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dukouDesktop", {
  onPasteFiles(callback) {
    const listener = (_event, files) => callback(files);
    ipcRenderer.on("dukou:paste-files", listener);
    return () => ipcRenderer.removeListener("dukou:paste-files", listener);
  }
});
