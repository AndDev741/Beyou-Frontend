/**
 * React Native's fetch/FormData cannot carry a `file://` uri part (it throws
 * "Unsupported FormDataPart implementation"), so the mobile app builds the
 * multipart request natively — today via `expo-file-system`'s `uploadAsync`.
 *
 * Registering that transport here (same injection shape as `setHttpClient`)
 * keeps ONE `uploadFeedbackAttachment` signature for both platforms instead of
 * forcing each app to reimplement the upload.
 */
export type FeedbackNativeUploadParams = {
  /** Path relative to the API base url, e.g. `/feedback/{id}/attachments`. */
  path: string;
  /** Always `"file"` — the backend accepts exactly one part with this name. */
  fieldName: string;
  uri: string;
  mimeType?: string;
};

export type FeedbackNativeUploadResponse = {
  status: number;
  /** Parsed JSON body when there was one. */
  data?: unknown;
};

export type FeedbackNativeUploader = (
  params: FeedbackNativeUploadParams
) => Promise<FeedbackNativeUploadResponse>;

let uploader: FeedbackNativeUploader | undefined;

export function setFeedbackNativeUploader(u: FeedbackNativeUploader): void {
  uploader = u;
}

export function resetFeedbackNativeUploader(): void {
  uploader = undefined;
}

export function getFeedbackNativeUploader(): FeedbackNativeUploader | undefined {
  return uploader;
}
