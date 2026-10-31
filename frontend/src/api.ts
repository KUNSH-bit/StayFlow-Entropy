import { handleMockRequest } from './mockData';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || "http://127.0.0.1:3000/api").replace(/\/$/, "");

let activeHotelId: string | null = null;
export function setActiveHotelId(id: string | null): void {
  activeHotelId = id;
}

// Track whether we should use mock engine (automatically enabled if server is offline or bypass is chosen)
let mockModeActive = true;

export function isMockMode(): boolean {
  return mockModeActive;
}

export function setMockMode(active: boolean): void {
  mockModeActive = active;
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

  // If mock mode is active, directly use mock engine for maximum speed and zero friction
  if (mockModeActive) {
    try {
      return await handleMockRequest<T>(path, init);
    } catch (mockError) {
      console.warn("Mock request handler error:", mockError);
    }
  }

  // Attempt real server request with an automatic fallback on connection failure
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch {
    // If backend is unreachable or timed out, seamlessly fall back to mock data
    console.info(`StayFlow API unreachable at ${API_BASE_URL}. Falling back to standalone mock store.`);
    mockModeActive = true;
    return await handleMockRequest<T>(path, init);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // If backend returns 404 or 500 while trying auth, fall back to mock engine
    if (response.status >= 500 || (response.status === 404 && path.startsWith("/auth/"))) {
      mockModeActive = true;
      return await handleMockRequest<T>(path, init);
    }

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
