import React from 'react';
import ReactDOM from 'react-dom/client';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './redux/store';
import './translations/i18n';
import { setAgentStreamConfig, setHttpClient, setLogger } from '@beyou/api';
import { axiosHttpClient } from './lib/axiosHttpClient';
import instance, { getRefreshedAccessToken } from './services/axiosConfig';
import { logger } from './utils/logger';

setHttpClient(axiosHttpClient);
setLogger(logger);
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
