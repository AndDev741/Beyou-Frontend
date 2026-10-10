import type { ApiErrorPayload } from '@beyou/api';
import { uploadFile } from './uploadFile';

type UploadResult = { success?: true; error?: ApiErrorPayload };

/** The profile photo, as one multipart part (see uploadFile for why it is not fetch). */
export async function uploadPhoto(uri: string, mimeType?: string): Promise<UploadResult> {
  const result = await uploadFile('/user/photo', uri, mimeType ?? 'image/jpeg');
  return result.error ? { error: result.error } : { success: true };
}
