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

export interface HttpClient {
  get<T>(url: string, config?: unknown): Promise<HttpResponse<T>>;
  post<T>(url: string, body?: unknown, config?: unknown): Promise<HttpResponse<T>>;
  put<T>(url: string, body?: unknown, config?: unknown): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: unknown): Promise<HttpResponse<T>>;
}

let client: HttpClient | undefined;

export function setHttpClient(c: HttpClient) {
  client = c;
}

export function getHttpClient(): HttpClient {
  if (!client) {
    throw new Error('HttpClient not configured — call setHttpClient() at app startup');
  }
  return client;
}
