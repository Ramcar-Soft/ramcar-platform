import { contextBridge, ipcRenderer } from "electron";

const api = {
  ping: () => ipcRenderer.invoke("ping"),
  getLanguage: () => ipcRenderer.invoke("get-language"),
  setLanguage: (locale: string) => ipcRenderer.invoke("set-language", locale),
};

contextBridge.exposeInMainWorld("api", api);
