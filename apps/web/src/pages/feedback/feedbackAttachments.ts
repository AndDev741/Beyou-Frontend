import type { TFunction } from "i18next";

/**
 * Mirrors the server-side ceilings so a rejected image reads as a sentence the
 * user can act on instead of a 400 after a round trip.
 */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(",");

export type SelectedAttachment = {
    file: File;
    previewUrl: string;
    /** Stripped of HTML metacharacters so the static analyser can prove it
     *  never reaches the DOM as raw markup. Prefer this over file.name in
     *  every rendered position (alt, aria-label, error messages). */
    displayName: string;
};

export type AttachmentSelection = {
    accepted: File[];
    errors: string[];
};

/**
 * Filters a freshly-picked batch against the type / size / count limits.
 * Rejections are per-file and named, so picking six screenshots at once tells
 * the user exactly which one did not make it.
 */
export const selectAttachments = (
    incoming: File[],
    alreadySelected: number,
    t: TFunction
): AttachmentSelection => {
    const accepted: File[] = [];
    const errors: string[] = [];
    let remaining = MAX_ATTACHMENTS - alreadySelected;

    for (const file of incoming) {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
            errors.push(t("FeedbackImageInvalidType", { name: file.name }));
            continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
            errors.push(t("FeedbackImageTooLarge", { name: file.name }));
            continue;
        }
        if (remaining <= 0) {
            const limitMessage = t("FeedbackImageLimitReached");
            if (!errors.includes(limitMessage)) errors.push(limitMessage);
            continue;
        }
        accepted.push(file);
        remaining -= 1;
    }

    return { accepted, errors };
};
