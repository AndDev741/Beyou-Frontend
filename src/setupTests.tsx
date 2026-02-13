import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Use manual mock to avoid parsing axios ESM bundle in Vitest
vi.mock('axios', () => {
  const instance: any = vi.fn();
  instance.interceptors = { response: { use: vi.fn() } };
  instance.defaults = { headers: { common: {} } };
  instance.get = vi.fn(() => Promise.resolve({ data: [] }));
  instance.post = vi.fn(() => Promise.resolve({ data: {} }));
  instance.put = vi.fn(() => Promise.resolve({ data: {} }));
  instance.delete = vi.fn(() => Promise.resolve({ data: {} }));

  const axios = {
    create: vi.fn(() => instance),
    isAxiosError: vi.fn(() => false),
    defaults: { headers: { common: {} } },
  };

  return { default: axios };
});

// Lightweight i18n stub so components can call t() without a full instance
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

// Route act calls to React's version to silence react-dom/test-utils deprecation warning
vi.mock('react-dom/test-utils', async () => {
  const actual = await vi.importActual<typeof import('react-dom/test-utils')>('react-dom/test-utils');
  const react = await vi.importActual<typeof import('react')>('react');
  return { ...actual, act: react.act };
});

// Polyfill matchMedia for components that rely on it
if (!window.matchMedia) {
  const matchMediaMock = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaMock,
  });
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
}
