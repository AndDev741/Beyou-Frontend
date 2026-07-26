import * as FileSystem from 'expo-file-system/legacy';
import { setFeedbackNativeUploader } from '@beyou/api';
import { getApiBaseUrl, getAccessToken, refreshAccessToken } from './nativeHttpClient';

/**
 * React Native's fetch/FormData cannot upload a `file://` uri (it throws
 * "Unsupported FormDataPart implementation"), so feedback images go out through
 * expo-file-system the same way the profile photo does — see `uploadPhoto.ts`.
 *
 * The shared `uploadFeedbackAttachment` calls whatever transport is registered
 * here, which keeps ONE upload signature for web and mobile. This MUST run once
 * at startup; without it a uri attachment fails with the translated fallback
 * error instead of uploading.
 */
export function registerFeedbackNativeUploader(): void {
  setFeedbackNativeUploader(async ({ path, fieldName, uri, mimeType }) => {
    const doUpload = (token: string | null) =>
      FileSystem.uploadAsync(`${getApiBaseUrl()}${path}`, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName,
        mimeType: mimeType ?? 'image/jpeg',
        headers: {
          'X-Client': 'mobile',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

    let result = await doUpload(getAccessToken());

    // Access tokens are short-lived (15 min). On 401 refresh once and retry —
    // mirroring nativeHttpClient so a stale token doesn't read as a lost image.
    if (result.status === 401 && (await refreshAccessToken())) {
      result = await doUpload(getAccessToken());
    }

    let data: unknown;
    try {
      data = JSON.parse(result.body);
    } catch {
      // Non-JSON body (empty 204, an HTML error page) — the status alone
      // decides success, and the shared parser falls back to a generic error.
    }

    return { status: result.status, ...(data !== undefined ? { data } : {}) };
  });
}
