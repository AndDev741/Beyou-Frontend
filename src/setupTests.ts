// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import React from 'react';
// Use manual mock to avoid parsing axios ESM bundle in Jest
jest.mock('axios');

// Lightweight i18n stub so components can call t() without a full instance
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Route act calls to React's version to silence react-dom/test-utils deprecation warning
jest.mock('react-dom/test-utils', () => {
  const actual = jest.requireActual('react-dom/test-utils');
  const react = jest.requireActual('react');
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
