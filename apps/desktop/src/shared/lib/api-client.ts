import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
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
    const headers = await getAuthHeaders();
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, { method: "GET", headers });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const url = buildUrl(path);
    const response = await fetch(url, { method: "DELETE", headers });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },
};
