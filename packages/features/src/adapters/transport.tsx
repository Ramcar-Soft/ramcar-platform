import { createContext, useContext, type ReactNode } from "react";

export interface TransportRequestOptions {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface TransportBodyRequestOptions {
  signal?: AbortSignal;
}

export interface TransportPort {
  get<T>(path: string, options?: TransportRequestOptions): Promise<T>;
  post<T>(path: string, data?: unknown, options?: TransportBodyRequestOptions): Promise<T>;
  patch<T>(path: string, data?: unknown, options?: TransportBodyRequestOptions): Promise<T>;
  put<T>(path: string, data?: unknown, options?: TransportBodyRequestOptions): Promise<T>;
  delete<T>(path: string, options?: TransportBodyRequestOptions): Promise<T>;
  upload<T>(path: string, formData: FormData, options?: TransportBodyRequestOptions): Promise<T>;
}

export interface ApiErrorShape {
  readonly name: "ApiError";
  readonly message: string;
  readonly status: number;
  readonly body: unknown;
}

const TransportContext = createContext<TransportPort | null>(null);

export function TransportProvider({
  value,
  children,
}: {
  value: TransportPort;
  children: ReactNode;
}) {
  return <TransportContext.Provider value={value}>{children}</TransportContext.Provider>;
}

export function useTransport(): TransportPort {
  const ctx = useContext(TransportContext);
  if (!ctx) throw new Error("useTransport must be used within a <TransportProvider>");
  return ctx;
}
