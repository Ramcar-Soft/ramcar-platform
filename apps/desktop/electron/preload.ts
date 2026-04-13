import { contextBridge, ipcRenderer } from "electron";

const api = {
  ping: () => ipcRenderer.invoke("ping"),
  getLanguage: () => ipcRenderer.invoke("get-language"),
  setLanguage: (locale: string) => ipcRenderer.invoke("set-language", locale),

  visitPersons: {
    list: (filters: Record<string, unknown>) => ipcRenderer.invoke("visit-persons:list", filters),
    get: (id: string) => ipcRenderer.invoke("visit-persons:get", id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke("visit-persons:create", data),
    vehicles: (visitPersonId: string) => ipcRenderer.invoke("visit-persons:vehicles", visitPersonId),
    createVehicle: (data: Record<string, unknown>) => ipcRenderer.invoke("visit-persons:create-vehicle", data),
    recentEvents: (visitPersonId: string) => ipcRenderer.invoke("visit-persons:recent-events", visitPersonId),
    createEvent: (data: Record<string, unknown>) => ipcRenderer.invoke("visit-persons:create-event", data),
    update: (id: string, patch: Record<string, unknown>) => ipcRenderer.invoke("visit-persons:update", id, patch),
    images: (visitPersonId: string) => ipcRenderer.invoke("visit-persons:images", visitPersonId),
    uploadImage: (visitPersonId: string, imageType: string, imageData: Uint8Array) =>
      ipcRenderer.invoke("visit-persons:upload-image", visitPersonId, imageType, imageData),
  },

  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    outboxCount: () => ipcRenderer.invoke("sync:outbox-count"),
    setAuthToken: (token: string | null) => ipcRenderer.invoke("sync:set-auth-token", token),
    onStatusChange: (callback: (status: { status: string; pendingCount: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { status: string; pendingCount: number }) => callback(data);
      ipcRenderer.on("sync-status", handler);
      return () => ipcRenderer.removeListener("sync-status", handler);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
