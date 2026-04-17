/**
 * Contract: TransportPort
 *
 * The only way @ramcar/features reads from or writes to the NestJS API.
 * Each host app (apps/web, apps/desktop) supplies an implementation and
 * injects it via <TransportProvider value={impl}> at its root.
 *
 * Rules:
 *  - Paths are relative ("/visit-persons"), not absolute URLs. Adapter resolves base URL.
 *  - `signal` MUST be forwarded to fetch() so TanStack Query cancellation works.
 *  - Errors MUST satisfy the existing ApiError contract
 *    (name === "ApiError", status: number, body: unknown) so shared hooks can branch on status.
 *  - Adapter is free to route writes through an outbox (desktop, offline-first)
 *    or directly to HTTP (web). The shared module MUST NOT care which.
 *
 * This file documents the contract; the runtime export will live at
 * packages/features/src/adapters/transport.ts during implementation.
 */

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

/** The hook shared code uses to obtain the transport. Runtime impl throws if no provider mounted. */
export interface UseTransport {
  (): TransportPort;
}

/** Adapter errors satisfy this shape; shared hooks assert `err.name === "ApiError"` to branch. */
export interface ApiErrorShape {
  readonly name: "ApiError";
  readonly message: string;
  readonly status: number;
  readonly body: unknown;
}
