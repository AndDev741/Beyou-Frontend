import type { Schemas } from "@beyou/contracts";
import type { ApiErrorPayload } from "../apiError";

// Wire shapes come straight from the generated OpenAPI contract so a backend
// rename fails the typecheck instead of silently breaking at runtime.
export type FeedbackContext = Schemas["FeedbackContext"];
export type FeedbackCategory = Schemas["CreateFeedbackRequest"]["category"];
export type CreateFeedbackRequest = Schemas["CreateFeedbackRequest"];
export type FeedbackResponse = Schemas["FeedbackResponse"];
export type FeedbackAttachment = Schemas["FeedbackAttachment"];

/**
 * One image to attach. Web passes a `Blob`/`File`; React Native passes the
 * `file://` uri it got from the image picker — RN's FormData cannot carry a
 * file uri part, so the uri variant is routed through the native uploader
 * registered with `setFeedbackNativeUploader`.
 */
export type FeedbackAttachmentInput =
  | { blob: Blob; name?: string }
  | { uri: string; mimeType?: string; name?: string };

export const isUriAttachment = (
  attachment: FeedbackAttachmentInput
): attachment is { uri: string; mimeType?: string; name?: string } => "uri" in attachment;

export type CreateFeedbackResult = {
  success?: FeedbackResponse;
  error?: ApiErrorPayload;
};

export type UploadFeedbackAttachmentResult = {
  success?: FeedbackAttachment;
  error?: ApiErrorPayload;
};

/** One image that did not store, kept alongside the ones that did. */
export type FailedFeedbackAttachment = {
  /** Position in the `attachments` array the caller passed in. */
  index: number;
  name?: string;
  error: ApiErrorPayload;
};

export type SubmitFeedbackInput = {
  category: FeedbackCategory;
  body: string;
  context?: FeedbackContext;
  attachments?: FeedbackAttachmentInput[];
};

/**
 * A submission that stored but whose third image failed is a SUCCESS with a
 * non-empty `failedAttachments` — never an error. `error` is reserved for the
 * case where nothing was recorded at all.
 */
export type SubmitFeedbackResult = {
  success?: {
    feedback: FeedbackResponse;
    attachments: FeedbackAttachment[];
    failedAttachments: FailedFeedbackAttachment[];
  };
  error?: ApiErrorPayload;
};
