import type { HttpClient, HttpResponse, RequestConfig } from '@beyou/api';
import { ApiError } from '@beyou/api';

let baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8099/api/v1';
let accessToken: string | null = null;

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

async function request<T>(method: string, path: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers: buildHeaders(config?.headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const headerObj: Record<string, string> = {};
  res.headers.forEach((v, k) => { headerObj[k] = v; });
  let data: unknown = undefined;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    throw new ApiError(res.status, data, `HTTP ${res.status}`);
  }
  return { data: data as T, headers: headerObj };
}

export const nativeHttpClient: HttpClient = {
  get: (url, config) => request('GET', url, undefined, config as RequestConfig),
  post: (url, body, config) => request('POST', url, body, config as RequestConfig),
  put: (url, body, config) => request('PUT', url, body, config as RequestConfig),
  delete: (url, config) => request('DELETE', url, undefined, config as RequestConfig),
};
