import type { TFunction } from 'i18next';
import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * Mirrors the server-side ceilings (and the web screen's) so a rejected image
 * reads as a sentence the user can act on instead of a 400 after a round trip.
 */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** One picked (or captured) image, in the shape the RN uploader takes. */
export type FeedbackImage = {
  uri: string;
  mimeType: string;
  name: string;
};

export type ImageSelection = {
  accepted: FeedbackImage[];
  errors: string[];
};

const nameOf = (asset: ImagePickerAsset, index: number): string =>
  asset.fileName || asset.uri.split('/').pop() || `image-${index + 1}`;

/**
 * Filters a freshly-picked batch against the type / size / count limits.
 * Rejections are per-file and named, so picking six screenshots at once tells
 * the user exactly which one did not make it.
 *
 * A missing `mimeType`/`fileSize` (some Android providers omit them) is treated
 * as acceptable rather than rejected — the backend re-validates, and refusing a
 * perfectly good screenshot because the picker was terse is the worse failure.
 */
export const selectImages = (
  incoming: ImagePickerAsset[],
  alreadySelected: number,
  t: TFunction,
): ImageSelection => {
  const accepted: FeedbackImage[] = [];
  const errors: string[] = [];
  let remaining = MAX_ATTACHMENTS - alreadySelected;

  incoming.forEach((asset, index) => {
    const name = nameOf(asset, index);

    if (asset.mimeType && !ALLOWED_ATTACHMENT_TYPES.includes(asset.mimeType)) {
      errors.push(t('FeedbackImageInvalidType', { name }));
      return;
    }
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_ATTACHMENT_BYTES) {
      errors.push(t('FeedbackImageTooLarge', { name }));
      return;
    }
    if (remaining <= 0) {
      const limitMessage = t('FeedbackImageLimitReached');
      if (!errors.includes(limitMessage)) errors.push(limitMessage);
      return;
    }

    accepted.push({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', name });
    remaining -= 1;
  });

  return { accepted, errors };
};
