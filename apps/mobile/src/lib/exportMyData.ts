import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import exportUserData from '@beyou/api/user/exportUserData';
import type { ApiErrorPayload } from '@beyou/api';

export type ExportResult = { success?: true; error?: ApiErrorPayload };

/**
 * Writes the account export to a file and hands it to the OS share sheet.
 *
 * `GET /user/export` has existed since the delete button did, and the phone had no
 * way to call it: the policy said the export was web-only and told anyone on Android
 * to send an email instead. That is a portability right answered by a mailbox, and
 * it was the wrong answer.
 *
 * There is no "downloads folder" to write to here. The file goes to the app's own
 * cache — private, and cleared by the OS when space runs short — and the share sheet
 * is what moves it somewhere the person actually keeps things: Drive, Files, mail,
 * whatever they picked. Which means the file only ever leaves this app by an explicit
 * choice, and nothing is left sitting in shared storage afterwards.
 *
 * Dated, not timestamped: the name is read by a human deciding which copy is the
 * recent one. Two exports on the same day overwrite, which is the right outcome —
 * the second is the better copy.
 */
export async function exportMyData(): Promise<ExportResult> {
  const response = await exportUserData();
  if (response.error || !response.data) {
    return { error: response.error ?? { errorKey: 'DownloadMyDataFailed' } };
  }

  try {
    const day = new Date().toISOString().slice(0, 10);
    const uri = `${FileSystem.cacheDirectory}beyou-data-${day}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(response.data, null, 2));

    // A device with no share target is rare but real (a stripped emulator image is
    // the usual one). Better to say the file could not be handed over than to write
    // it into a cache directory the user cannot reach and report success.
    if (!(await Sharing.isAvailableAsync())) {
      return { error: { errorKey: 'DownloadMyDataFailed' } };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Beyou',
    });
    return { success: true };
  } catch {
    return { error: { errorKey: 'DownloadMyDataFailed' } };
  }
}
