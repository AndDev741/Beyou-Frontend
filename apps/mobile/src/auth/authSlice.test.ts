import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login, bootstrap } from './authSlice';
import * as authApi from './authApi';
import * as secureStore from './secureStore';
import { setAccessToken } from '../lib/nativeHttpClient';
import type { AppDispatch } from '../store';

jest.mock('./authApi');
jest.mock('./secureStore');
jest.mock('../lib/nativeHttpClient', () => ({
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
}));

const store = () => configureStore({ reducer: { auth: authReducer } });

describe('authSlice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login success → authenticated + persists refresh + seeds access', async () => {
    (authApi.loginRequest as jest.Mock).mockResolvedValueOnce({
      accessToken: 'jwt',
      refreshToken: 'id.tok',
      profile: { email: 'a@b.com' },
    });
    const s = store();
    const dispatch = s.dispatch as AppDispatch;
    await dispatch(login({ email: 'a@b.com', password: 'pw' }));
    expect(secureStore.setRefreshToken).toHaveBeenCalledWith('id.tok');
    expect(setAccessToken).toHaveBeenCalledWith('jwt');
    expect(s.getState().auth.status).toBe('authenticated');
    expect(s.getState().auth.profile?.email).toBe('a@b.com');
  });

  it('login EMAIL_NOT_VERIFIED → unauthenticated + needsVerification', async () => {
    const { ApiError } = jest.requireActual('@beyou/api');
    (authApi.loginRequest as jest.Mock).mockRejectedValueOnce(
      new ApiError(403, { error: 'EMAIL_NOT_VERIFIED' }),
    );
    const s = store();
    const dispatch = s.dispatch as AppDispatch;
    await dispatch(login({ email: 'a@b.com', password: 'pw' }));
    expect(s.getState().auth.status).toBe('unauthenticated');
    expect(s.getState().auth.needsVerification).toBe(true);
  });

  it('bootstrap with no stored token → unauthenticated', async () => {
    (secureStore.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);
    const s = store();
    const dispatch = s.dispatch as AppDispatch;
    await dispatch(bootstrap());
    expect(s.getState().auth.status).toBe('unauthenticated');
  });
});
