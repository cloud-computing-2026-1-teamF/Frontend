// Thin HTTP client used by every endpoint helper in `src/api/endpoints/*`.
//
// While `USE_MOCK = true`, requests never leave the browser — they are routed
// through `mockRoute()` which reads/writes localStorage and the seed dataset.
// To switch to the real backend, flip `USE_MOCK` to `false` and the same call
// sites will hit the URLs declared in `API_명세_수정본.md`.

import { ApiError, type ApiEnvelope, type ApiErrorBody } from './types';
import { mockRoute } from './mock/router';

const envUseMock = import.meta.env.VITE_USE_MOCK;
export const USE_MOCK = envUseMock === undefined ? true : envUseMock !== 'false';
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1';
const ACCESS_TOKEN_KEY = 'sg_access_token';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RequestSpec = {
  method: Method;
  path: string;                       // e.g. '/analyses/42' — no query string
  query?: Record<string, unknown>;    // serialised into ?a=b&c=d
  body?: unknown;                     // JSON-serialisable
};

const MOCK_LATENCY_MS = 80;

export async function apiRequest<T>(spec: RequestSpec): Promise<ApiEnvelope<T>> {
  if (USE_MOCK) {
    await sleep(MOCK_LATENCY_MS);
    const result = mockRoute(spec);
    if ('error' in result) {
      throw new ApiError(result.status, { error: result.error });
    }
    return result.body as ApiEnvelope<T>;
  }

  return realApiRequest<T>(spec, true);
}

async function realApiRequest<T>(spec: RequestSpec, allowRefresh: boolean): Promise<ApiEnvelope<T>> {
  // Pass `location.origin` as base so relative `BASE_URL` values like "/v1"
  // (used when Amplify proxies /v1/* to the backend) don't crash the URL
  // constructor. For absolute URLs the second argument is ignored.
  const url = new URL(BASE_URL + spec.path, window.location.origin);
  if (spec.query) {
    for (const [k, v] of Object.entries(spec.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), {
    method: spec.method,
    headers,
    body: spec.body !== undefined ? JSON.stringify(toSnakeCase(spec.body)) : undefined,
    credentials: 'include',
  });

  if (res.status === 401 && allowRefresh && spec.path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return realApiRequest<T>(spec, false);
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  const body = await res.json();
  return toCamelCase(body) as ApiEnvelope<T>;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      credentials: 'include',
    });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const body = toCamelCase(await res.json()) as ApiEnvelope<{ accessToken: string }>;
    setAccessToken(body.data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

async function parseError(res: Response): Promise<ApiErrorBody> {
  try {
    const body = await res.json();
    if (body?.error?.code && body?.error?.message) return body;
  } catch {
    // Fall through to a generic HTTP error body.
  }
  return { error: { code: 'http_error', message: res.statusText || `HTTP ${res.status}` } };
}

export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAccessToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore private-mode/quota failures. The in-memory auth state still works.
  }
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      toCamelCase(nested),
    ]),
  );
}

function toSnakeCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeCase);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`),
      toSnakeCase(nested),
    ]),
  );
}
