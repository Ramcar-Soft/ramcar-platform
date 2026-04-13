export interface VisitPersonsAPI {
  list: (filters: Record<string, unknown>) => Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  get: (id: string) => Promise<Record<string, unknown>>;
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  vehicles: (visitPersonId: string) => Promise<Record<string, unknown>[]>;
  createVehicle: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  recentEvents: (visitPersonId: string) => Promise<Record<string, unknown>[]>;
  createEvent: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
  images: (visitPersonId: string) => Promise<Record<string, unknown>[]>;
  uploadImage: (visitPersonId: string, imageType: string, imageData: Uint8Array) => Promise<{ id: string; localPath: string; imageType: string }>;
}

export interface SyncAPI {
  status: () => Promise<{ status: string; pendingCount: number }>;
  trigger: () => Promise<{ triggered: boolean }>;
  outboxCount: () => Promise<number>;
  setAuthToken: (token: string | null) => Promise<void>;
  onStatusChange: (callback: (status: { status: string; pendingCount: number }) => void) => () => void;
}

export interface ElectronAPI {
  ping: () => Promise<string>;
  getLanguage: () => Promise<string>;
  setLanguage: (locale: string) => Promise<void>;
  visitPersons: VisitPersonsAPI;
  sync: SyncAPI;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
