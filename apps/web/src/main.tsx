import React from 'react';
import ReactDOM from 'react-dom/client';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './redux/store';
import './translations/i18n';
import { createReportingLogger, setAgentStreamConfig, setHttpClient, setLogger } from '@beyou/api';
import { axiosHttpClient } from './lib/axiosHttpClient';
import instance, { getRefreshedAccessToken } from './services/axiosConfig';
import { logger } from './utils/logger';
import { initTelemetry, reportHandledFailure } from './lib/telemetry';
import { initAnalytics } from './lib/analytics';

// First thing in the entry module: unhandled errors thrown while the rest of
// the boot sequence runs are only reported if the SDK is already listening.
// No-ops entirely when VITE_SENTRY_DSN is unset (see lib/telemetry.ts).
initTelemetry();

// Product analytics (PostHog). Same posture: no VITE_POSTHOG_KEY, no capture,
// and @beyou/api's analytics seam stays a no-op. See lib/analytics.ts.
initAnalytics();

setHttpClient(axiosHttpClient);
// The shared API client handles every failure itself, so a 500 or a dropped
// connection never reaches the ErrorBoundary or window.onerror. This keeps the
// console output intact and additionally forwards the failures that indicate a
// real defect — 5xx, transport failures, and anything that is not a recognisable
// API error — to the collector. 4xx stay console-only: those are the server
// rejecting a request on purpose. See @beyou/api's errorReporting.ts.
// NOTE: deliberately wraps `logger` here instead of teaching `logger.error`
// itself to report — ErrorBoundary calls logger.error AND reportCaughtError, so
// that would file every render crash twice.
setLogger(createReportingLogger(logger, reportHandledFailure));
// SSE streaming rides raw fetch (axios/XHR buffers whole responses), so it
// borrows the axios instance's base URL, always-fresh auth header, and the
// same shared refresh (so a stream 401 doesn't race a second refresh).
setAgentStreamConfig({
  baseUrl: instance.defaults.baseURL ?? '',
  getHeaders: (): Record<string, string> => {
    const auth = instance.defaults.headers.common.Authorization;
    return auth ? { Authorization: String(auth) } : {};
  },
  refreshAuth: async (): Promise<boolean> => {
    try {
      const token = await getRefreshedAccessToken();
      instance.defaults.headers.common.Authorization = `Bearer ${token}`;
      return true;
    } catch {
      return false;
    }
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root container missing');
}

ReactDOM.createRoot(rootElement).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </PersistGate>
  </Provider>,
);
