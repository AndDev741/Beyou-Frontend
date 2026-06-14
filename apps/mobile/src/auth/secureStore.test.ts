import * as SecureStore from 'expo-secure-store';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from './secureStore';

jest.mock('expo-secure-store');

describe('secureStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the refresh token under a single key', async () => {
    await setRefreshToken('id.token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('beyou.refreshToken', 'id.token');
  });

  it('reads the refresh token (null when absent)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    expect(await getRefreshToken()).toBeNull();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('id.token');
    expect(await getRefreshToken()).toBe('id.token');
  });

  it('clears the refresh token', async () => {
    await clearRefreshToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('beyou.refreshToken');
  });
});
