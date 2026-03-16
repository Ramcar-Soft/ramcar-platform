import { contextBridge, ipcRenderer } from "electron";

const api = {
  ping: () => ipcRenderer.invoke("ping"),
};

contextBridge.exposeInMainWorld("api", api);
