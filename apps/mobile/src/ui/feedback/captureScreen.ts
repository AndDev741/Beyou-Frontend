import { captureScreen } from 'react-native-view-shot';
import type { FeedbackImage } from './feedbackAttachments';

/**
 * KTD5: mobile capture snapshots the NATIVE view hierarchy, so it does not
 * share the web's DOM-reconstruction failure modes — a screenshot here is a
 * faithful picture of what the user was looking at.
 *
 * KTD3: only ever called from intact-screen paths. On the crash boundary the
 * failed screen has already been replaced by the fallback, so there is nothing
 * worth photographing and the report carries the error text instead.
 */
export const CAPTURE_FILE_NAME = 'screen.jpg';
export const CAPTURE_MIME_TYPE = 'image/jpeg';

export async function captureCurrentScreen(): Promise<FeedbackImage | null> {
  try {
    const uri = await captureScreen({ format: 'jpg', quality: 0.8, result: 'tmpfile' });
    if (!uri) return null;
    return { uri, mimeType: CAPTURE_MIME_TYPE, name: CAPTURE_FILE_NAME };
  } catch (e) {
    // A capture that fails must never block the report — the user still gets
    // the form, just without the screenshot. Logged so it is not invisible.
    // eslint-disable-next-line no-console
    console.error('[feedback] screen capture failed', e);
    return null;
  }
}
