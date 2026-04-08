export interface ElectronAPI {
  ping: () => Promise<string>;
  getLanguage: () => Promise<string>;
  setLanguage: (locale: string) => Promise<void>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
