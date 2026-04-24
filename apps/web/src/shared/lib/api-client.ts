import { createClient } from "@/shared/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type TenantRevokedBody = { code: string; message: string; tenantIds?: string[] };
type TenantRevokedHandler = (body: TenantRevokedBody) => void;
let tenantRevokedHandler: TenantRevokedHandler | null = null;

export function registerTenantRevokedHandler(handler: TenantRevokedHandler): void {
  tenantRevokedHandler = handler;
}

const ACTIVE_TENANT_STORAGE_KEY = "ramcar.auth.activeTenantId";

const EXEMPT_PATH_PREFIXES = [
  "/auth/",
  "/tenants",
  "/users/me",
  "/health",
  "/version",
];

export function getExemptPaths(): readonly string[] {
  return EXEMPT_PATH_PREFIXES;
}

function isExemptPath(path: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getActiveTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) ?? "";
}

async function getAuthHeaders(path: string): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  if (!isExemptPath(path)) {
    const activeTenantId = getActiveTenantId();
    if (!activeTenantId) {
      throw new Error("No active tenant set — request rejected. This is a client bug.");
    }
    headers["X-Active-Tenant-Id"] = activeTenantId;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));

    if (response.status === 403 && body?.code === "TENANT_ACCESS_REVOKED") {
      // Notify the app shell so it can refresh the session and hydrate a new active tenant.
      // The api-client stays framework-agnostic — recovery logic lives in the registered handler.
      if (tenantRevokedHandler) {
        tenantRevokedHandler(body as TenantRevokedBody);
      }
      throw new ApiError(body.message ?? "Tenant access revoked", 403, body);
    }

    throw new ApiError(
      body.message ?? response.statusText,
      response.status,
      body,
    );
  }
  return response.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export const apiClient = {
  async get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<T> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, { method: "GET", headers });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path);
    const response = await fetch(url, { method: "DELETE", headers });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    if (!isExemptPath(path)) {
      const activeTenantId = getActiveTenantId();
      if (!activeTenantId) {
        throw new Error("No active tenant set — request rejected. This is a client bug.");
      }
      headers["X-Active-Tenant-Id"] = activeTenantId;
    }

    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },

  async download(path: string, options?: { params?: Record<string, unknown> }): Promise<{ blob: Blob; filename: string }> {
    const headers = await getAuthHeaders(path);
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(body.message ?? response.statusText, response.status, body);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("text/csv")) {
      throw new ApiError("Unexpected response format", response.status, null);
    }

    const disposition = response.headers.get("content-disposition") ?? "";
    const match = /filename="([^"]+)"/i.exec(disposition);
    const filename = match?.[1] ?? "export.csv";

    const blob = await response.blob();
    return { blob, filename };
  },
};
