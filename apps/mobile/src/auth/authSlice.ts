import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiError, parseApiError, getLogger } from '@beyou/api';
import getProfile from '@beyou/api/user/getProfile';
import { setAccessToken } from '../lib/nativeHttpClient';
import * as secureStore from './secureStore';
import { loginRequest, registerRequest, refreshRequest, logoutRequest } from './authApi';
import type { AuthStatus, Profile } from './types';

// NOTE: getProfile() takes no t argument — it uses its own internal error message.
// A real i18n t is wired in Task 7 at the App level; this slice stays transport-only.

interface AuthState {
  status: AuthStatus;
  profile: Profile | null;
  needsVerification: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: 'loading',
  profile: null,
  needsVerification: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { accessToken, refreshToken, profile } = await loginRequest(creds.email, creds.password);
      setAccessToken(accessToken);
      await secureStore.setRefreshToken(refreshToken);
      return profile;
    } catch (e) {
      const parsed = parseApiError(e);
      if (e instanceof ApiError && parsed.message === 'EMAIL_NOT_VERIFIED') {
        return rejectWithValue('EMAIL_NOT_VERIFIED');
      }
      return rejectWithValue('INVALID_CREDENTIALS');
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (d: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      await registerRequest(d.name, d.email, d.password);
      return true;
    } catch (e) {
      getLogger().error('auth register failed', e);
      return rejectWithValue('REGISTER_FAILED');
    }
  },
);

export const bootstrap = createAsyncThunk<Profile, void>(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    const stored = await secureStore.getRefreshToken();
    if (!stored) return rejectWithValue('NO_TOKEN');
    try {
      const { accessToken, refreshToken } = await refreshRequest(stored);
      setAccessToken(accessToken);
      await secureStore.setRefreshToken(refreshToken);
      // getProfile() takes no arguments and returns { data?: UserType } | { error?: string }
      const res = await getProfile();
      if (res.error || !res.data) return rejectWithValue('PROFILE_FAILED');
      // TODO: reconcile @beyou/types UserType with @beyou/contracts UserResponseDTO (tracked: thread contract types into @beyou/api)
      return res.data as unknown as Profile;
    } catch (e) {
      getLogger().error('auth bootstrap failed', e);
      await secureStore.clearRefreshToken();
      return rejectWithValue('REFRESH_FAILED');
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  const stored = await secureStore.getRefreshToken();
  if (stored) {
    try {
      await logoutRequest(stored);
    } catch {
      // ignore — always clear local state
    }
  }
  await secureStore.clearRefreshToken();
  setAccessToken(null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => {
      s.error = null;
      s.needsVerification = false;
    });
    b.addCase(login.fulfilled, (s, a) => {
      s.status = 'authenticated';
      s.profile = a.payload as Profile;
      s.error = null;
    });
    b.addCase(login.rejected, (s, a) => {
      s.status = 'unauthenticated';
      s.needsVerification = a.payload === 'EMAIL_NOT_VERIFIED';
      s.error = a.payload as string;
    });
    b.addCase(register.pending, (s) => {
      s.error = null;
      s.needsVerification = false;
    });
    b.addCase(bootstrap.fulfilled, (s, a) => {
      s.status = 'authenticated';
      s.profile = a.payload as Profile;
      s.error = null;
    });
    b.addCase(bootstrap.rejected, (s) => {
      s.status = 'unauthenticated';
      s.error = null;
    });
    b.addCase(logout.fulfilled, (s) => {
      s.status = 'unauthenticated';
      s.profile = null;
      s.error = null;
    });
  },
});

export default authSlice.reducer;
