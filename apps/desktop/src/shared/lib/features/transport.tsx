import type { ReactNode } from "react";
import { TransportProvider, type TransportPort } from "@ramcar/features/adapters";
import { apiClient } from "../api-client";

const desktopTransport: TransportPort = {
  get: (path, options) => apiClient.get(path, { params: options?.params }),
  post: (path, data) => apiClient.post(path, data),
  patch: (path, data) => apiClient.patch(path, data),
  // TODO: wire window.electron.sync.enqueue() here for offline outbox writes
  put: (path, data) => apiClient.put(path, data),
  delete: (path) => apiClient.delete(path),
  upload: (path, formData) => apiClient.upload(path, formData),
};

export function DesktopTransportProvider({ children }: { children: ReactNode }) {
  return <TransportProvider value={desktopTransport}>{children}</TransportProvider>;
}
