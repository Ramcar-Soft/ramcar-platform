/// <reference types="vite/client" />

export interface ElectronAPI {
  ping: () => Promise<string>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
