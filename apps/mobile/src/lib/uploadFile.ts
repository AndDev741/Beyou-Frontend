import * as FileSystem from 'expo-file-system/legacy';
import type { ApiErrorPayload } from '@beyou/api';
import { getApiBaseUrl, getAccessToken, refreshAccessToken } from './nativeHttpClient';

export type UploadResult<T> = { success?: T; error?: ApiErrorPayload };

/**
 * One file as a multipart part named `file`, POSTed to `path` under the API.
 *
 * React Native's fetch/FormData cannot upload a file:// uri (it throws "Unsupported
 * FormDataPart implementation"), so expo-file-system builds the request natively from the uri.
 * That bypasses nativeHttpClient, so the headers (auth, X-Client) and the one 401 refresh are
 * handled here. A JSON body comes back parsed.
 *
 * `fileName` is the name the server should see. The part's filename is the uri's last segment,
 * and a picker's cache copy has a random one, so a file with another name goes up as a copy
 * under its own.
 */
export async function uploadFile<T = unknown>(path: string, uri: string, mimeType: string, fileName?: string): Promise<UploadResult<T>> {
  let named: { uri: string; dir: string | null } = { uri, dir: null };
  try {
    named = await underName(uri, fileName);
    const doUpload = (token: string | null) =>
      FileSystem.uploadAsync(`${getApiBaseUrl()}${path}`, named.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: {
          'X-Client': 'mobile',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

    let result = await doUpload(getAccessToken());

    // Access tokens are short-lived (15 min). On 401, refresh once and retry, mirroring
    // nativeHttpClient, so a stale token does not surface as a generic error.
    if (result.status === 401 && (await refreshAccessToken())) {
      result = await doUpload(getAccessToken());
    }

    let body: unknown = null;
    try {
      body = result.body ? JSON.parse(result.body) : null;
    } catch {
      // not JSON: a success with no body, or an error page
    }
    if (result.status >= 200 && result.status < 300) return { success: body as T };

    const errorKey = (body as { errorKey?: string } | null)?.errorKey;
    return { error: { errorKey: errorKey ?? 'UnexpectedError' } };
  } catch {
    return { error: { errorKey: 'UnexpectedError' } };
  } finally {
    if (named.dir) void FileSystem.deleteAsync(named.dir, { idempotent: true }).catch(() => {});
  }
}

/** The file at `uri` under `fileName`: itself when the names match, else a copy in its own folder. */
async function underName(uri: string, fileName?: string): Promise<{ uri: string; dir: string | null }> {
  const name = fileName?.replace(/[\\/]/g, '_').trim();
  if (!name || !FileSystem.cacheDirectory) return { uri, dir: null };
  const encoded = encodeURIComponent(name);
  if (uri.endsWith(`/${encoded}`) || uri.endsWith(`/${name}`)) return { uri, dir: null };
  const dir = `${FileSystem.cacheDirectory}upload-${Date.now()}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await FileSystem.copyAsync({ from: uri, to: dir + encoded });
  return { uri: dir + encoded, dir };
}
