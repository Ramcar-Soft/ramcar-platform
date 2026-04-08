"use strict";
const electron = require("electron");
const api = {
  ping: () => electron.ipcRenderer.invoke("ping")
};
electron.contextBridge.exposeInMainWorld("api", api);
