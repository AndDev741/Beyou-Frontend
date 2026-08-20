jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@beyou/api/user/exportUserData', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import exportUserData from '@beyou/api/user/exportUserData';
import { exportMyData } from './exportMyData';

const fetchExport = exportUserData as jest.MockedFunction<typeof exportUserData>;

describe('exportMyData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  });

  it('writes the export to a dated file and opens the share sheet', async () => {
    fetchExport.mockResolvedValue({ data: { profile: { name: 'someone' } } });

    const result = await exportMyData();

    expect(result).toEqual({ success: true });

    const [uri, body] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(uri).toMatch(/^file:\/\/\/cache\/beyou-data-\d{4}-\d{2}-\d{2}\.json$/);
    // The whole payload, not a summary of it — a truncated export is the failure
    // this feature exists to avoid.
    expect(JSON.parse(body)).toEqual({ profile: { name: 'someone' } });

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      uri,
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  it('reports the API error and writes nothing when the export cannot be fetched', async () => {
    fetchExport.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    const result = await exportMyData();

    expect(result).toEqual({ error: { errorKey: 'UnexpectedError' } });
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  /**
   * The file would be sitting in a private cache directory the person cannot open,
   * so reporting success here would be a lie about where their data went.
   */
  it('fails loudly when the device has no way to share the file', async () => {
    fetchExport.mockResolvedValue({ data: { profile: {} } });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await exportMyData();

    expect(result.error?.errorKey).toBe('DownloadMyDataFailed');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('does not throw out of the caller when the write fails', async () => {
    fetchExport.mockResolvedValue({ data: { profile: {} } });
    (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValue(new Error('no space'));

    await expect(exportMyData()).resolves.toEqual({
      error: { errorKey: 'DownloadMyDataFailed' },
    });
  });
});
