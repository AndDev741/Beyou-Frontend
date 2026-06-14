import axios from 'axios';
import type { HttpClient } from '@beyou/api';
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

export const axiosHttpClient: HttpClient = {
  get: (url, config) => call(instance.get(url, config as any)),
  post: (url, body, config) => call(instance.post(url, body, config as any)),
  put: (url, body, config) => call(instance.put(url, body, config as any)),
  delete: (url, config) => call(instance.delete(url, config as any)),
};
