import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import uploadFeedbackAttachment from "./uploadFeedbackAttachment";
import { setFeedbackNativeUploader, resetFeedbackNativeUploader } from "./nativeUploader";

const t = ((key: string) => `tr:${key}`) as never;

describe("uploadFeedbackAttachment", () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset();
    setHttpClient({ post, get: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  afterEach(() => {
    resetFeedbackNativeUploader();
  });

  describe("blob attachments (web)", () => {
    test("uploads one multipart part named file and returns the success envelope", async () => {
      const stored = {
        id: "att-1",
        feedbackId: "fb-1",
        url: "/feedback/fb-1/attachments/att-1",
        contentType: "image/jpeg",
        width: 800,
        height: 600,
        sizeBytes: 40_000,
        createdAt: "2026-07-26T10:00:00",
      };
      post.mockResolvedValue({ data: stored });

      const blob = new Blob(["fake-bytes"], { type: "image/png" });
      const result = await uploadFeedbackAttachment("fb-1", { blob, name: "shot.png" }, t);

      expect(result.success).toEqual(stored);
      const [url, body] = post.mock.calls[0];
      expect(url).toBe("/feedback/fb-1/attachments");
      expect(body).toBeInstanceOf(FormData);
      expect((body as FormData).get("file")).toBeTruthy();
      expect([...(body as FormData).keys()]).toEqual(["file"]);
    });

    test("parses a server rejection into the error envelope instead of throwing", async () => {
      post.mockRejectedValue(
        new ApiError(400, { errorKey: "FEEDBACK_ATTACHMENT_TOO_LARGE", message: "5 MB max" })
      );

      const result = await uploadFeedbackAttachment(
        "fb-1",
        { blob: new Blob(["x"], { type: "image/png" }) },
        t
      );

      expect(result.success).toBeUndefined();
      expect(result.error?.errorKey).toBe("FEEDBACK_ATTACHMENT_TOO_LARGE");
    });

    test("returns the error envelope with a translated fallback on network failure", async () => {
      post.mockRejectedValue(new TypeError("Network request failed"));

      const result = await uploadFeedbackAttachment(
        "fb-1",
        { blob: new Blob(["x"], { type: "image/png" }) },
        t
      );

      expect(result.error).toEqual({ message: "tr:UnexpectedError" });
    });
  });

  describe("uri attachments (React Native)", () => {
    test("delegates to the registered native uploader", async () => {
      const upload = vi.fn().mockResolvedValue({ status: 201, data: { id: "att-9", feedbackId: "fb-1" } });
      setFeedbackNativeUploader(upload);

      const result = await uploadFeedbackAttachment(
        "fb-1",
        { uri: "file:///tmp/photo.jpg", mimeType: "image/jpeg" },
        t
      );

      expect(upload).toHaveBeenCalledWith({
        path: "/feedback/fb-1/attachments",
        fieldName: "file",
        uri: "file:///tmp/photo.jpg",
        mimeType: "image/jpeg",
      });
      expect(result.success).toEqual({ id: "att-9", feedbackId: "fb-1" });
      expect(post).not.toHaveBeenCalled();
    });

    test("maps a non-2xx native response onto the error envelope", async () => {
      setFeedbackNativeUploader(
        vi.fn().mockResolvedValue({ status: 400, data: { errorKey: "FEEDBACK_ATTACHMENT_INVALID_TYPE" } })
      );

      const result = await uploadFeedbackAttachment("fb-1", { uri: "file:///tmp/a.tiff" }, t);

      expect(result.success).toBeUndefined();
      expect(result.error?.errorKey).toBe("FEEDBACK_ATTACHMENT_INVALID_TYPE");
    });

    test("returns the translated fallback when no native uploader is registered", async () => {
      const result = await uploadFeedbackAttachment("fb-1", { uri: "file:///tmp/a.jpg" }, t);

      expect(result.error).toEqual({ message: "tr:UnexpectedError" });
    });
  });
});
