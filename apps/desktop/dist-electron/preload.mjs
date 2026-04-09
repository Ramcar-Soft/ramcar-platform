"use strict";
const electron = require("electron");
const api = {
  ping: () => electron.ipcRenderer.invoke("ping"),
  getLanguage: () => electron.ipcRenderer.invoke("get-language"),
  setLanguage: (locale) => electron.ipcRenderer.invoke("set-language", locale)
};
electron.contextBridge.exposeInMainWorld("api", api);
