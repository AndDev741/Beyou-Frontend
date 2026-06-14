export class ApiError extends Error {
  constructor(public status: number, public data?: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

export interface HttpResponse<T> {
  data: T;
  headers: Record<string, string>;
}

/**
 * Transport-agnostic request configuration.
 *
 * Intentionally kept narrow so every adapter (axios, fetch, React Native)
 * is required to support exactly these three options — no silently-dropped
 * keys (e.g. `params` being ignored by a fetch adapter).
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
  post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
  put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
}

let client: HttpClient | undefined;

export function setHttpClient(c: HttpClient) {
  client = c;
}

export function resetHttpClient() {
  client = undefined;
}

export function getHttpClient(): HttpClient {
  if (!client) {
    throw new Error('HttpClient not configured — call setHttpClient() at app startup');
  }
  return client;
}
