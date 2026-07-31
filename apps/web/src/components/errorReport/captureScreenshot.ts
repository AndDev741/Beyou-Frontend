import { logger } from "../../utils/logger";
import { MAX_ATTACHMENT_BYTES } from "../../pages/feedback/feedbackAttachments";

/** Name the capture is attached under, so it is recognisable in the inbox. */
export const SCREENSHOT_FILE_NAME = "error-screen.png";

/**
 * The report panel is drawn on top of the failure it is reporting. Dropping it
 * from the capture keeps the screenshot a picture of the bug rather than a
 * picture of the form.
 */
const EXCLUDED_SELECTORS = ["[data-error-report-panel]"];

/**
 * KTD4: capture runs on snapdom. html2canvas is explicitly not recommended for
 * production by its own author and mishandles pseudo-elements, web fonts and
 * Shadow DOM — all of which this app leans on through its CSS-variable themes
 * and icon fonts. `html-to-image` is the named fallback if snapdom ever proves
 * unworkable; nothing here should quietly become html2canvas.
 *
 * The library is imported dynamically so it lands in its own chunk instead of
 * the boot bundle — the boundary that calls this is loaded on every page view,
 * and a capture library there would be the worst possible place for it.
 *
 * Never throws. A capture is an optional extra on a report that must be sent
 * regardless; `null` means "no image", not "no report".
 */
export const captureScreenshot = async (target?: Element | null): Promise<File | null> => {
    const element = target ?? document.body;
    if (!element) return null;

    try {
        const { snapdom } = await import("@zumer/snapdom");
        const blob = await snapdom.toBlob(element, {
            type: "png",
            exclude: EXCLUDED_SELECTORS,
            excludeMode: "remove"
        });

        if (!blob || blob.size === 0) return null;

        // Same ceiling the manual picker enforces: an oversized capture would
        // be rejected by the upload anyway, and losing the image is far better
        // than losing the report.
        if (blob.size > MAX_ATTACHMENT_BYTES) {
            logger.warn("Screenshot exceeded the attachment size limit; reporting without it");
            return null;
        }

        return new File([blob], SCREENSHOT_FILE_NAME, { type: "image/png" });
    } catch (error) {
        logger.warn("Screenshot capture failed; reporting without it", error);
        return null;
    }
};
