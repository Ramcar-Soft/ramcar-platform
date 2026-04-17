"use client";

import type { ReactNode } from "react";
import { TransportProvider, type TransportPort } from "@ramcar/features/adapters";
import { apiClient } from "@/shared/lib/api-client";

const webTransport: TransportPort = {
  get: (path, options) => apiClient.get(path, { params: options?.params }),
  post: (path, data) => apiClient.post(path, data),
  patch: (path, data) => apiClient.patch(path, data),
  put: (path, data) => apiClient.put(path, data),
  delete: (path) => apiClient.delete(path),
  upload: (path, formData) => apiClient.upload(path, formData),
};

export function WebTransportProvider({ children }: { children: ReactNode }) {
  return <TransportProvider value={webTransport}>{children}</TransportProvider>;
}
