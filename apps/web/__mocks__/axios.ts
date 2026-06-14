import { vi } from 'vitest';

interface MockAxios {
  create: any;
  get: any;
  post: any;
  put: any;
  delete: any;
  isAxiosError: (error: unknown) => boolean;
}

const mockAxios: MockAxios = {
  // Reuse the same mock instance for axios.create calls
  create: vi.fn(() => mockAxios),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  isAxiosError: (error: unknown) => Boolean(error && (error as { isAxiosError?: boolean }).isAxiosError),
};

export default mockAxios;
