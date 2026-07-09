import type { HttpClient, HttpResponse, RequestConfig } from '@beyou/api';
import { ApiError } from '@beyou/api';
import i18next from 'i18next';
import { notify } from '../notify';

let baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8099/api/v1';
let accessToken: string | null = null;

// NOTE: accessToken is module-level singleton state. Test files that import this
// module must reset it in beforeEach (e.g. setAccessToken(null)) to avoid state bleed.
export function setAccessToken(token: string | null): void { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }
export function getApiBaseUrl(): string { return baseUrl; }
export function __setBaseUrl(url: string): void { baseUrl = url; } // test seam

type RefreshHandler = () => Promise<boolean>; // resolves true if a new access token is now set
let refreshHandler: RefreshHandler | null = null;
let onUnauthenticatedCb: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setRefreshHandler(h: RefreshHandler | null): void { refreshHandler = h; }
export function setOnUnauthenticated(cb: (() => void) | null): void { onUnauthenticatedCb = cb; }

function refreshOnce(): Promise<boolean> {
  if (!refreshHandler) return Promise.resolve(false);
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Public single-flight refresh for callers that bypass request() (e.g. the
// expo-file-system photo upload) but still need the same 401 recovery.
export function refreshAccessToken(): Promise<boolean> { return refreshOnce(); }

function buildUrl(path: string, params?: RequestConfig['params']): string {
  if (!params) return `${baseUrl}${path}`;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-Client': 'mobile', ...extra };
  if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
  return h;
}

// A request with no response would otherwise hang forever (no native fetch timeout),
// leaving the UI stuck on a spinner. Abort after DEFAULT_TIMEOUT_MS (override per call
// via config.timeout) so callers get a rejected promise → error toast instead.
const DEFAULT_TIMEOUT_MS = 20000;

async function request<T>(method: string, path: string, body?: unknown, config?: RequestConfig, isRetry = false): Promise<HttpResponse<T>> {
  const controller = new AbortController();
  const timeoutMs = config?.timeout ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, config?.params), {
      method,
      headers: buildHeaders(config?.headers),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    // AbortError = our timeout fired; anything else = a transport failure
    // (unreachable host, DNS, connection refused). Surface both as a status-0 ApiError.
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError(0, undefined, `Request timed out after ${timeoutMs}ms`);
    }
    throw new ApiError(0, undefined, e instanceof Error ? e.message : 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
  const headerObj: Record<string, string> = {};
  // Fetch's Headers.forEach yields lowercased keys — consumers read e.g. 'x-access-token', not 'X-Access-Token'.
  res.headers.forEach((v, k) => { headerObj[k] = v; });
  let data: unknown = undefined;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch (e) {
      // A 2xx that promised JSON but returned a malformed body is a real error — surface it.
      if (res.ok) throw new Error(`Failed to parse JSON response (status ${res.status}): ${String(e)}`);
      // non-2xx: leave data undefined; the ApiError below carries the status.
    }
  }

  if (res.status === 401 && !isRetry && !path.includes('/auth/')) {
    const refreshed = await refreshOnce();
    if (refreshed) return request<T>(method, path, body, config, true);
    onUnauthenticatedCb?.();
    throw new ApiError(401, data, 'Unauthorized');
  }
  if (res.status === 429) {
    notify.error(i18next.t('RATE_LIMIT_EXCEEDED'));
    throw new ApiError(res.status, data, `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new ApiError(res.status, data, `HTTP ${res.status}`);
  }
  return { data: data as T, headers: headerObj };
}

export const nativeHttpClient: HttpClient = {
  get: (url, config) => request('GET', url, undefined, config),
  post: (url, body, config) => request('POST', url, body, config),
  put: (url, body, config) => request('PUT', url, body, config),
  delete: (url, config) => request('DELETE', url, undefined, config),
};
