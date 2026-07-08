import * as FileSystem from 'expo-file-system/legacy';
import type { ApiErrorPayload } from '@beyou/api';
import { getApiBaseUrl, getAccessToken } from './nativeHttpClient';

type UploadResult = { success?: true; error?: ApiErrorPayload };

// React Native's fetch/FormData cannot upload a file:// uri (throws
// "Unsupported FormDataPart implementation"). expo-file-system builds the
// multipart request natively from the uri instead. This bypasses
// nativeHttpClient, so headers (auth, X-Client) are set here.
export async function uploadPhoto(uri: string, mimeType?: string): Promise<UploadResult> {
  try {
    const token = getAccessToken();
    const result = await FileSystem.uploadAsync(`${getApiBaseUrl()}/user/photo`, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mimeType ?? 'image/jpeg',
      headers: {
        'X-Client': 'mobile',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (result.status >= 200 && result.status < 300) return { success: true };

    let errorKey: string | undefined;
    try {
      errorKey = JSON.parse(result.body)?.errorKey;
    } catch {
      // non-JSON body — fall through to generic error
    }
    return { error: { errorKey: errorKey ?? 'UnexpectedError' } };
  } catch {
    return { error: { errorKey: 'UnexpectedError' } };
  }
}
