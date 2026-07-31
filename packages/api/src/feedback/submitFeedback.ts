import { TFunction } from "i18next";
import { getLogger } from "../logger";
import createFeedback from "./createFeedback";
import uploadFeedbackAttachment from "./uploadFeedbackAttachment";
import {
    FailedFeedbackAttachment,
    FeedbackAttachment,
    SubmitFeedbackInput,
    SubmitFeedbackResult
} from "./feedbackTypes";

/**
 * "Submit with N images" as one call: creates the submission, then uploads each
 * image against the returned id (the backend takes one image per request).
 *
 * Partial failure stays legible — once the submission is stored the result is a
 * SUCCESS carrying both the attachments that stored and the ones that did not,
 * so the UI can say "sent, 1 image failed" instead of "sending failed" while
 * the feedback sits in the inbox. `error` means nothing was recorded.
 *
 * Uploads run sequentially: the backend counts attachments per submission
 * (max 5) and firing them in parallel makes that ceiling race.
 */
const submitFeedback = async (
    input: SubmitFeedbackInput,
    t: TFunction
): Promise<SubmitFeedbackResult> => {
    const created = await createFeedback(
        {
            category: input.category,
            body: input.body,
            ...(input.context ? { context: input.context } : {})
        },
        t
    );

    if (!created.success) {
        return { error: created.error ?? { message: t("UnexpectedError") } };
    }

    const feedback = created.success;
    const attachments = input.attachments ?? [];

    if (attachments.length === 0) {
        return { success: { feedback, attachments: [], failedAttachments: [] } };
    }

    if (!feedback.id) {
        // Stored, but there is no id to hang images off — surfacing this as a
        // success with silently-dropped images would be a lie.
        getLogger().error(new Error("Feedback created without an id — cannot upload attachments"));
        return { error: { message: t("UnexpectedError") } };
    }

    const uploaded: FeedbackAttachment[] = [];
    const failed: FailedFeedbackAttachment[] = [];

    for (let index = 0; index < attachments.length; index += 1) {
        const attachment = attachments[index];
        const result = await uploadFeedbackAttachment(feedback.id, attachment, t);

        if (result.success) {
            uploaded.push(result.success);
        } else {
            failed.push({
                index,
                ...(attachment.name ? { name: attachment.name } : {}),
                error: result.error ?? { message: t("UnexpectedError") }
            });
        }
    }

    return { success: { feedback, attachments: uploaded, failedAttachments: failed } };
};

export default submitFeedback;
