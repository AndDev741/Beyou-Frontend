import { TFunction } from "i18next";
import { getHttpClient, ApiError } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import { getFeedbackNativeUploader } from "./nativeUploader";
import {
    FeedbackAttachment,
    FeedbackAttachmentInput,
    UploadFeedbackAttachmentResult,
    isUriAttachment
} from "./feedbackTypes";

const attachmentsPath = (feedbackId: string) => `/feedback/${feedbackId}/attachments`;

/**
 * Uploads ONE image against an existing submission. Ceilings enforced by the
 * backend: 5 MB, 25 MP, 5 attachments per submission, and only image/jpeg,
 * image/png, image/webp or image/gif. Failures come back as the error envelope
 * (`FEEDBACK_ATTACHMENT_INVALID_TYPE`, `FEEDBACK_ATTACHMENT_TOO_LARGE`,
 * `FEEDBACK_ATTACHMENT_LIMIT_REACHED`, `FEEDBACK_ATTACHMENT_CORRUPT`, …).
 */
const uploadFeedbackAttachment = async (
    feedbackId: string,
    attachment: FeedbackAttachmentInput,
    t: TFunction
): Promise<UploadFeedbackAttachmentResult> => {
    const fallback = { error: { message: t("UnexpectedError") } };

    try {
        if (isUriAttachment(attachment)) {
            const nativeUploader = getFeedbackNativeUploader();
            if (!nativeUploader) {
                getLogger().error(
                    new Error("No feedback native uploader registered — call setFeedbackNativeUploader() at app startup")
                );
                return fallback;
            }

            const response = await nativeUploader({
                path: attachmentsPath(feedbackId),
                fieldName: "file",
                uri: attachment.uri,
                ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {})
            });

            if (response.status < 200 || response.status >= 300) {
                // Reuse the shared parser so native and web failures land in the
                // same envelope shape rather than two dialects of error.
                const error = new ApiError(response.status, response.data);
                getLogger().error(error);
                const parsed = parseApiError(error);
                return Object.keys(parsed).length > 0 ? { error: parsed } : fallback;
            }

            return { success: (response.data ?? {}) as FeedbackAttachment };
        }

        const formData = new FormData();
        // Exactly one part, named `file` — the backend rejects anything else.
        formData.append("file", attachment.blob, attachment.name);

        const response = await getHttpClient().post<FeedbackAttachment>(
            attachmentsPath(feedbackId),
            formData
        );
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return Object.keys(parsed).length > 0 ? { error: parsed } : fallback;
    }
};

export default uploadFeedbackAttachment;
