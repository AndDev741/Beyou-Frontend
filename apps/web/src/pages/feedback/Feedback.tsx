import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Paperclip, Send, X } from "lucide-react";
import buildFeedbackContext from "@beyou/api/feedback/feedbackContext";
import submitFeedback from "@beyou/api/feedback/submitFeedback";
import type {
    FeedbackAttachmentInput,
    FeedbackContext
} from "@beyou/api/feedback/feedbackTypes";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import ErrorNotice from "../../components/ErrorNotice";
import Button from "../../components/Button";
import { useTheme } from "../../context/ThemeContext";
import { APP_VERSION } from "../../appVersion";
import {
    ATTACHMENT_ACCEPT,
    MAX_ATTACHMENTS,
    SelectedAttachment,
    selectAttachments
} from "./feedbackAttachments";
import { FEEDBACK_CATEGORY_LABEL_KEYS, buildFeedbackMailtoHref } from "./feedbackMailto";
import { FEEDBACK_BODY_MAX_LENGTH, FeedbackFormValues, NO_CATEGORY, feedbackSchema } from "./feedbackSchema";

const CATEGORY_ORDER: FeedbackFormValues["category"][] = ["BUG", "FEATURE_REQUEST", "OTHER"];

type SubmissionOutcome =
    | { kind: "sent"; failedAttachments: number }
    | { kind: "failed"; error: ApiErrorPayload };

function Feedback() {
    useAuthGuard();
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const { theme } = useTheme();

    const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
    const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
    const [outcome, setOutcome] = useState<SubmissionOutcome | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema(t)),
        defaultValues: { category: NO_CATEGORY, body: "" }
    });

    const watchedCategory = watch("category");
    const watchedBody = watch("body");

    const context: FeedbackContext | undefined = useMemo(
        () =>
            buildFeedbackContext({
                screen: pathname,
                appVersion: APP_VERSION,
                platform: "web",
                language: i18n.language,
                theme: theme.mode
            }),
        [pathname, i18n.language, theme.mode]
    );

    const mailtoHref = useMemo(
        () =>
            buildFeedbackMailtoHref({
                category: watchedCategory,
                body: watchedBody,
                context,
                t
            }),
        [watchedCategory, watchedBody, context, t]
    );

    // Preview blobs are ours to release; leaking them keeps the images pinned in
    // memory for the life of the tab.
    const attachmentsRef = useRef(attachments);
    useEffect(() => {
        attachmentsRef.current = attachments;
    }, [attachments]);
    useEffect(
        () => () => attachmentsRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl)),
        []
    );

    const clearAttachments = useCallback((current: SelectedAttachment[]) => {
        current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
        return [];
    }, []);

    const onFilesChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = Array.from(event.target.files ?? []);
        if (chosen.length === 0) return;

        const { accepted, errors: rejections } = selectAttachments(chosen, attachments.length, t);
        setAttachmentErrors(rejections);
        setAttachments((current) => [
            ...current,
            ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
        ]);

        // Allow re-picking the same file after a removal.
        event.target.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments((current) => {
            const target = current[index];
            if (target) URL.revokeObjectURL(target.previewUrl);
            return current.filter((_, position) => position !== index);
        });
    };

    const onSubmit = async (values: FeedbackFormValues) => {
        setOutcome(null);

        const payload: FeedbackAttachmentInput[] = attachments.map(({ file }) => ({
            blob: file,
            name: file.name
        }));

        const result = await submitFeedback(
            {
                category: values.category,
                body: values.body,
                ...(context ? { context } : {}),
                ...(payload.length > 0 ? { attachments: payload } : {})
            },
            t
        );

        // Partial failure is still a success: the report is in the inbox, only
        // some images are not. Saying "sending failed" here would be a lie that
        // makes the user submit the same thing twice.
        if (result.success) {
            setOutcome({ kind: "sent", failedAttachments: result.success.failedAttachments.length });
            reset({ category: NO_CATEGORY, body: "" });
            setAttachments(clearAttachments);
            setAttachmentErrors([]);
            return;
        }

        setOutcome({ kind: "failed", error: result.error ?? { message: t("UnexpectedError") } });
    };

    return (
        <div className="min-h-screen w-full bg-background text-secondary">
            <Header pageName="FeedbackPageTitle" />

            <div className="mx-auto w-full max-w-2xl px-3 py-6">
                <p className="text-sm text-description">{t("FeedbackIntro")}</p>

                {outcome?.kind === "sent" && (
                    <div
                        data-testid="feedback-success"
                        role="status"
                        className="mt-4 rounded-xl border-2 border-success bg-background p-4"
                    >
                        <p className="text-base font-semibold text-success">{t("FeedbackSuccessTitle")}</p>
                        <p className="mt-1 text-sm text-description">{t("FeedbackSuccessBody")}</p>
                        {outcome.failedAttachments > 0 && (
                            <p className="mt-2 text-sm font-medium text-error">
                                {t("FeedbackPartialAttachmentWarning", { count: outcome.failedAttachments })}
                            </p>
                        )}
                    </div>
                )}

                {outcome?.kind === "failed" && (
                    <div
                        data-testid="feedback-failure"
                        role="alert"
                        className="mt-4 rounded-xl border-2 border-error bg-background p-4"
                    >
                        <p className="text-base font-semibold text-error">{t("FeedbackFailedTitle")}</p>
                        <p className="mt-1 text-sm text-description">{t("FeedbackFailedBody")}</p>
                        <ErrorNotice error={outcome.error} className="mt-1" />
                        <a
                            data-testid="feedback-mailto-fallback"
                            href={mailtoHref}
                            className="mt-3 inline-flex items-center gap-2 rounded-[20px] border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-background"
                        >
                            <Mail size={16} aria-hidden="true" />
                            {t("FeedbackEmailLink")}
                        </a>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-6" noValidate>
                    <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                            <fieldset className="border-0 p-0">
                                <legend className="mb-2 text-base font-semibold text-secondary">
                                    {t("FeedbackCategoryLabel")}
                                </legend>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORY_ORDER.map((category) => {
                                        const isChosen = field.value === category;
                                        return (
                                            <label
                                                key={category}
                                                className={`flex cursor-pointer items-center gap-2 rounded-[20px] border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                                                    isChosen
                                                        ? "border-primary bg-primary text-background"
                                                        : "border-description text-secondary hover:border-primary hover:text-primary"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    className="sr-only"
                                                    name={field.name}
                                                    value={category}
                                                    checked={isChosen}
                                                    onChange={() => field.onChange(category)}
                                                    onBlur={field.onBlur}
                                                />
                                                {t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                                            </label>
                                        );
                                    })}
                                </div>
                                {errors.category?.message && (
                                    <p className="mt-2 text-sm text-error">{errors.category.message}</p>
                                )}
                            </fieldset>
                        )}
                    />

                    <Controller
                        control={control}
                        name="body"
                        render={({ field }) => (
                            <div className="flex flex-col">
                                <label
                                    htmlFor="feedback-body"
                                    className="mb-2 text-base font-semibold text-secondary"
                                >
                                    {t("FeedbackBodyLabel")}
                                </label>
                                <textarea
                                    id="feedback-body"
                                    rows={7}
                                    maxLength={FEEDBACK_BODY_MAX_LENGTH}
                                    placeholder={t("FeedbackBodyPlaceholder")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    className="w-full rounded-xl border-2 border-primary bg-background p-3 text-secondary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                {errors.body?.message && (
                                    <p className="mt-2 text-sm text-error">{errors.body.message}</p>
                                )}
                            </div>
                        )}
                    />

                    <div className="flex flex-col">
                        <span className="mb-1 text-base font-semibold text-secondary">
                            {t("FeedbackImagesLabel")}
                        </span>
                        <span className="mb-2 text-xs text-description">{t("FeedbackImagesHint")}</span>

                        <label
                            htmlFor="feedback-images"
                            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[20px] border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-background"
                        >
                            <Paperclip size={16} aria-hidden="true" />
                            {t("FeedbackAddImages")}
                        </label>
                        <input
                            id="feedback-images"
                            type="file"
                            multiple
                            accept={ATTACHMENT_ACCEPT}
                            onChange={onFilesChosen}
                            disabled={attachments.length >= MAX_ATTACHMENTS}
                            className="sr-only"
                        />

                        {attachmentErrors.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1">
                                {attachmentErrors.map((message) => (
                                    <li key={message} className="text-sm text-error">
                                        {message}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {attachments.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-3">
                                {attachments.map(({ file, previewUrl }, index) => (
                                    <li key={previewUrl} className="relative">
                                        <img
                                            src={previewUrl}
                                            alt={file.name}
                                            className="h-24 w-24 rounded-lg border border-primary object-cover"
                                        />
                                        <button
                                            type="button"
                                            aria-label={t("FeedbackRemoveImage", { name: file.name })}
                                            onClick={() => removeAttachment(index)}
                                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-background text-secondary transition-colors duration-200 hover:bg-primary hover:text-background"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Button
                            text={isSubmitting ? t("FeedbackSubmitting") : t("FeedbackSubmit")}
                            size="big"
                            mode="create"
                            type="submit"
                            disabled={isSubmitting}
                            testId="feedback-submit"
                            icon={<Send size={20} />}
                        />
                    </div>
                </form>

                {/* R7: the mailto is a standing alternative, not only a failure hatch. */}
                <p className="mt-6 text-sm text-description">
                    {t("FeedbackEmailPreference")}{" "}
                    <a
                        data-testid="feedback-mailto-preference"
                        href={mailtoHref}
                        className="font-semibold text-primary underline underline-offset-2"
                    >
                        {t("FeedbackEmailLink")}
                    </a>
                </p>
            </div>
        </div>
    );
}

export default Feedback;
