import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { HttpClient, RequestConfig } from '@beyou/api';
import { ApiError } from '@beyou/api';
import instance from '../services/axiosConfig';

async function call<T>(p: Promise<{ data: T; headers: any }>) {
  try {
    const r = await p;
    return { data: r.data, headers: (r.headers ?? {}) as Record<string, string> };
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw new ApiError(e.response?.status ?? 0, e.response?.data, e.message);
    }
    throw e;
  }
}

// RequestConfig is a subset of AxiosRequestConfig (headers/params/timeout).
// The cast is narrow — only these three fields are ever present.
function toAxios(config?: RequestConfig): AxiosRequestConfig | undefined {
  return config as AxiosRequestConfig | undefined;
}

export const axiosHttpClient: HttpClient = {
  get: (url, config) => call(instance.get(url, toAxios(config))),
  post: (url, body, config) => call(instance.post(url, body, toAxios(config))),
  put: (url, body, config) => call(instance.put(url, body, toAxios(config))),
  delete: (url, config) => call(instance.delete(url, toAxios(config))),
};
