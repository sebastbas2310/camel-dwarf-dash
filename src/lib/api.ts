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
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal ?? null,
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

/** Thin, typed service layer mirroring the Spring Boot endpoints. */
export const api = {
  login: (username: string, password: string) =>
    apiRequest<{ token: string; username: string; role: Role; displayName?: string }>(
      "/auth/login",
      { method: "POST", body: { username, password } },
    ),
  competitors: {
    list: () => apiRequest("/competitors"),
    get: (id: number) => apiRequest(`/competitors/${id}`),
    create: (body: unknown) => apiRequest("/competitors", { method: "POST", body }),
    update: (id: number, body: unknown) =>
      apiRequest(`/competitors/${id}`, { method: "PUT", body }),
    deactivate: (id: number) => apiRequest(`/competitors/${id}`, { method: "DELETE" }),
  },
  teams: {
    list: () => apiRequest("/teams"),
    create: (body: unknown) => apiRequest("/teams", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/teams/${id}`, { method: "PUT", body }),
    addMember: (teamId: number, competitorId: number) =>
      apiRequest(`/teams/${teamId}/members/${competitorId}`, { method: "POST" }),
    removeMember: (teamId: number, competitorId: number) =>
      apiRequest(`/teams/${teamId}/members/${competitorId}`, { method: "DELETE" }),
  },
  races: {
    list: () => apiRequest("/races"),
    create: (body: unknown) => apiRequest("/races", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/races/${id}`, { method: "PUT", body }),
    registrations: (raceId: number) => apiRequest(`/races/${raceId}/registrations`),
    approve: (raceId: number, registrationId: number) =>
      apiRequest(`/races/${raceId}/registrations/${registrationId}/approve`, { method: "POST" }),
    reject: (raceId: number, registrationId: number, validationNotes: string) =>
      apiRequest(`/races/${raceId}/registrations/${registrationId}/reject`, {
        method: "POST",
        body: { validationNotes },
      }),
    results: (raceId: number) => apiRequest(`/races/${raceId}/results`),
    saveResults: (raceId: number, body: unknown) =>
      apiRequest(`/races/${raceId}/results`, { method: "POST", body }),
  },
  standings: () => apiRequest("/standings"),
  auditLogs: () => apiRequest("/audit-logs"),
};