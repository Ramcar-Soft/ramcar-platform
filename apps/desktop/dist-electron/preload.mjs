"use strict";
const electron = require("electron");
const api = {
  ping: () => electron.ipcRenderer.invoke("ping"),
  getLanguage: () => electron.ipcRenderer.invoke("get-language"),
  setLanguage: (locale) => electron.ipcRenderer.invoke("set-language", locale),
  visitPersons: {
    list: (filters) => electron.ipcRenderer.invoke("visit-persons:list", filters),
    get: (id) => electron.ipcRenderer.invoke("visit-persons:get", id),
    create: (data) => electron.ipcRenderer.invoke("visit-persons:create", data),
    vehicles: (visitPersonId) => electron.ipcRenderer.invoke("visit-persons:vehicles", visitPersonId),
    createVehicle: (data) => electron.ipcRenderer.invoke("visit-persons:create-vehicle", data),
    recentEvents: (visitPersonId) => electron.ipcRenderer.invoke("visit-persons:recent-events", visitPersonId),
    createEvent: (data) => electron.ipcRenderer.invoke("visit-persons:create-event", data),
    update: (id, patch) => electron.ipcRenderer.invoke("visit-persons:update", id, patch),
    images: (visitPersonId) => electron.ipcRenderer.invoke("visit-persons:images", visitPersonId),
    uploadImage: (visitPersonId, imageType, imageData) => electron.ipcRenderer.invoke("visit-persons:upload-image", visitPersonId, imageType, imageData)
  },
  sync: {
    status: () => electron.ipcRenderer.invoke("sync:status"),
    trigger: () => electron.ipcRenderer.invoke("sync:trigger"),
    outboxCount: () => electron.ipcRenderer.invoke("sync:outbox-count"),
    setAuthToken: (token) => electron.ipcRenderer.invoke("sync:set-auth-token", token),
    onStatusChange: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("sync-status", handler);
      return () => electron.ipcRenderer.removeListener("sync-status", handler);
    }
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
