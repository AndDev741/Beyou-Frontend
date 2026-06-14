import type { HttpClient, HttpResponse, RequestConfig } from '@beyou/api';
import { ApiError } from '@beyou/api';

let baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8099/api/v1';
let accessToken: string | null = null;

// NOTE: accessToken is module-level singleton state. Test files that import this
// module must reset it in beforeEach (e.g. setAccessToken(null)) to avoid state bleed.
export function setAccessToken(token: string | null): void { accessToken = token; }
export function __setBaseUrl(url: string): void { baseUrl = url; } // test seam

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

// TODO: RequestConfig.timeout is not yet honored — implement via AbortController in
// a future task. No Phase 1 path uses it and adding it now would complicate the
// upcoming refresh/retry logic.
async function request<T>(method: string, path: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers: buildHeaders(config?.headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
