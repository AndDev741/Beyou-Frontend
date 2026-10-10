/**
 * uploadFile sends the file under the name the server should see. The multipart filename is the
 * uri's last segment, and a picker's cache copy has a random one, so a named file goes up as a
 * copy under its own name, removed afterwards.
 * Boundary mocked = expo-file-system (legacy) + the native http client's token helpers.
 */
const mockUploadAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();
const mockDeleteAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  FileSystemUploadType: { MULTIPART: 1 },
  uploadAsync: (...args: unknown[]) => mockUploadAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));
jest.mock('../src/lib/nativeHttpClient', () => ({
  getApiBaseUrl: () => 'http://api',
  getAccessToken: () => 'token',
  refreshAccessToken: async () => false,
}));

import { uploadFile } from '../src/lib/uploadFile';

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadAsync.mockResolvedValue({ status: 202, body: '{"id":"s1"}' });
  mockCopyAsync.mockResolvedValue(undefined);
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
});

it('uploads the uri as it is when no name is given', async () => {
  const result = await uploadFile('/users/photo', 'file:///cache/ImagePicker/abc.jpg', 'image/jpeg');

  expect(result).toEqual({ success: { id: 's1' } });
  expect(mockCopyAsync).not.toHaveBeenCalled();
  expect(mockUploadAsync.mock.calls[0][0]).toBe('http://api/users/photo');
  expect(mockUploadAsync.mock.calls[0][1]).toBe('file:///cache/ImagePicker/abc.jpg');
});

it('uploads a copy under the file name, and removes it afterwards', async () => {
  await uploadFile('/notebook/pages/p/sources/pdf', 'file:///cache/DocumentPicker/3f2a.pdf', 'application/pdf', 'OSTEP chapter 4.pdf');

  const [{ from, to }] = mockCopyAsync.mock.calls[0];
  expect(from).toBe('file:///cache/DocumentPicker/3f2a.pdf');
  expect(to).toMatch(/^file:\/\/\/cache\/upload-\d+\/OSTEP%20chapter%204\.pdf$/);
  expect(mockUploadAsync.mock.calls[0][1]).toBe(to);
  expect(mockDeleteAsync).toHaveBeenCalledWith(to.slice(0, to.lastIndexOf('/') + 1), { idempotent: true });
});

it('skips the copy when the uri already ends in the name', async () => {
  await uploadFile('/notebook/pages/p/sources/pdf', 'file:///docs/ostep.pdf', 'application/pdf', 'ostep.pdf');

  expect(mockCopyAsync).not.toHaveBeenCalled();
  expect(mockUploadAsync.mock.calls[0][1]).toBe('file:///docs/ostep.pdf');
});

it('reports an error key from the server', async () => {
  mockUploadAsync.mockResolvedValue({ status: 413, body: '{"errorKey":"NOTEBOOK_SOURCE_TOO_LARGE"}' });

  expect(await uploadFile('/notebook/pages/p/sources/pdf', 'file:///docs/big.pdf', 'application/pdf', 'big.pdf'))
    .toEqual({ error: { errorKey: 'NOTEBOOK_SOURCE_TOO_LARGE' } });
});
