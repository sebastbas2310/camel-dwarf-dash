import type { Role } from "./types";

export const API_BASE_URL = "https://camelvsdwarf.onrender.com/api/v1";

const TOKEN_KEY = "eia.token";
const USER_KEY = "eia.user";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** Maps backend/transport failures to friendly, user-facing copy. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Some of the details you entered aren't valid. Please review the form.";
      case 401:
        return "Your session has expired. Please sign in again.";
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "We couldn't find what you were looking for.";
      case 409:
        return "That conflicts with existing data — try a different value.";
      case 0:
        return "The racing server is offline. Showing demo data instead.";
      default:
        return "Something went wrong on the racing server. Please try again.";
    }
  }
  return "Something unexpected happened. Please try again.";
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function readStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { username: string; displayName: string; role: Role };
  } catch {
    return null;
  }
}

export function writeStoredUser(user: unknown | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/**
 * Centralized request helper. Attaches `Authorization: Bearer <token>` to every
 * call and normalizes failures into `ApiError`. Network failures use status 0 so
 * callers can fall back to local demo data.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = getToken();
  let response: Response;
  // The hosted server sleeps between visits, so give up quickly and fall back to demo data.
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 12000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal ?? timeout,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApiError(0, "Network unreachable");
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw new ApiError(401, "Unauthorized");
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Spring pages come back as `{ content, page, size, ... }`. */
export function unwrapPage<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { content?: unknown }).content)) {
    return (payload as { content: T[] }).content;
  }
  return [];
}

const PAGE_QUERY = "?page=0&size=200";

/** Thin, typed service layer mirroring the Spring Boot endpoints (`/api/v1`). */
export const api = {
  /** The backend exposes no auth endpoint yet, so this always fails over to demo mode. */
  login: (username: string, password: string) =>
    apiRequest<{ token: string; username: string; role: Role; displayName?: string }>(
      "/auth/login",
      { method: "POST", body: { username, password }, timeoutMs: 8000 },
    ),
  users: {
    list: () => apiRequest(`/users${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/users/${id}`),
    create: (body: unknown) => apiRequest("/users", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/users/${id}`, { method: "PUT", body }),
  },
  teams: {
    list: () => apiRequest(`/teams${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/teams/${id}`),
    create: (body: unknown) => apiRequest("/teams", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/teams/${id}`, { method: "PUT", body }),
  },
  races: {
    list: () => apiRequest(`/races${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/races/${id}`),
    create: (body: unknown) => apiRequest("/races", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/races/${id}`, { method: "PUT", body }),
  },
  registrations: {
    list: () => apiRequest(`/registrations${PAGE_QUERY}`),
    create: (body: unknown) => apiRequest("/registrations", { method: "POST", body }),
    update: (id: number, body: unknown) =>
      apiRequest(`/registrations/${id}`, { method: "PUT", body }),
  },
  results: {
    list: () => apiRequest(`/results${PAGE_QUERY}`),
    create: (body: unknown) => apiRequest("/results", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/results/${id}`, { method: "PUT", body }),
  },
};
