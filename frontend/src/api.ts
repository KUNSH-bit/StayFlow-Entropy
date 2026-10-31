const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || "http://127.0.0.1:3000/api").replace(/\/$/, "");

let activeHotelId: string | null = null;
export function setActiveHotelId(id: string | null): void {
  activeHotelId = id;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (activeHotelId) headers.set("X-Hotel-Id", activeHotelId);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError("Could not reach the StayFlow API. Check that the server is running.", 0, "NETWORK_ERROR");
  }
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload ? (payload as { error?: { message?: string; code?: string } }).error : undefined;
    const apiError = new ApiError(error?.message || `Request failed with status ${response.status}.`, response.status, error?.code || "REQUEST_FAILED");
    if (response.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new CustomEvent("stayflow:session-expired"));
    throw apiError;
  }
  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string): Promise<void> {
  return apiRequest<void>(path, { method: "DELETE" });
}
