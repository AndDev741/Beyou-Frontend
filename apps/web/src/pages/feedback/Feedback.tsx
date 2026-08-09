import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bug, Image as ImageIcon, Lightbulb, Mail, MessageSquare, Paperclip, Send, X } from "lucide-react";
import buildFeedbackContext from "@beyou/api/feedback/feedbackContext";
import submitFeedback from "@beyou/api/feedback/submitFeedback";
import type {
    FeedbackAttachmentInput,
    FeedbackContext
} from "@beyou/api/feedback/feedbackTypes";
import type { ApiErrorPayload } from "@beyou/api/apiError";
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
import PageHeader from "../../ui/PageHeader";

const CATEGORY_ORDER: FeedbackFormValues["category"][] = ["BUG", "FEATURE_REQUEST", "OTHER"];

/** Each category's icon — shown only on the chosen option, as in the mockup. */
const CATEGORY_ICONS: Record<FeedbackFormValues["category"], typeof Bug> = {
    BUG: Bug,
    FEATURE_REQUEST: Lightbulb,
    OTHER: MessageSquare,
};

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
        setAttachmentErrors(rejections.map((e) => e.replace(/[<>]/g, "")));
        setAttachments((current) => [
            ...current,
            ...accepted.map((file) => {
                const displayName = file.name.replace(/[<>]/g, "");
                return { file, displayName, previewUrl: URL.createObjectURL(file) };
            })
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
        <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full bg-bg px-3 py-5 text-text lg:px-7 lg:py-6">
            <PageHeader title={t("FeedbackPageTitle")} subtitle={t("FeedbackSubtitle")} />

            <div className="mt-4 w-full max-w-2xl">

                {outcome?.kind === "sent" && (
                    <div
                        data-testid="feedback-success"
                        role="status"
                        className="mt-4 rounded-control border border-success/30 bg-success/10 p-3"
                    >
                        <p className="text-[13px] font-semibold text-text">{t("FeedbackSuccessTitle")}</p>
                        <p className="mt-1 text-sm text-text-2">{t("FeedbackSuccessBody")}</p>
                        {outcome.failedAttachments > 0 && (
                            <p className="mt-2 text-sm font-medium text-danger">
                                {t("FeedbackPartialAttachmentWarning", { count: outcome.failedAttachments })}
                            </p>
                        )}
                    </div>
                )}

                {outcome?.kind === "failed" && (
                    <div
                        data-testid="feedback-failure"
                        role="alert"
                        className="mt-4 rounded-control border border-danger/30 bg-danger/10 p-3"
                    >
                        <p className="text-base font-semibold text-danger">{t("FeedbackFailedTitle")}</p>
                        <p className="mt-1 text-sm text-text-2">{t("FeedbackFailedBody")}</p>
                        {/* Already a feedback form: offering "report this problem"
                            here would just loop the user back to where they are.
                            The mailto below is the real way out. */}
                        <ErrorNotice error={outcome.error} className="mt-1" canReport={false} />
                        <a
                            data-testid="feedback-mailto-fallback"
                            href={mailtoHref}
                            className="mt-3 inline-flex items-center gap-2 rounded-[20px] border border-border px-4 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent hover:text-on-accent"
                        >
                            <Mail size={16} aria-hidden="true" />
                            {t("FeedbackEmailLink")}
                        </a>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 lg:p-5"
                    noValidate
                >
                    <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                            <fieldset className="border-0 p-0">
                                <legend className="mb-1.5 text-[12.5px] font-semibold text-text-2">
                                    {t("FeedbackCategoryLabel")}
                                </legend>
                                {/* Segmented, like the rest of the forms: the three
                                    options are exclusive and fit in one
                                    linha, inclusive no telefone. */}
                                <div className="flex rounded-control border border-border bg-surface-2 p-[3px]">
                                    {CATEGORY_ORDER.map((category) => {
                                        const isChosen = field.value === category;
                                        const Icon = CATEGORY_ICONS[category];
                                        return (
                                            <label
                                                key={category}
                                                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-2 py-2 text-[12.5px] font-semibold transition-colors duration-200 ${
                                                    isChosen
                                                        ? "bg-surface text-accent shadow-sm"
                                                        : "text-text-3 hover:text-text-2"
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
                                                {isChosen && <Icon size={13} aria-hidden="true" />}
                                                {t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                                            </label>
                                        );
                                    })}
                                </div>
                                {errors.category?.message && (
                                    <p className="mt-2 text-sm text-danger">{errors.category.message}</p>
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
                                    className="mb-1.5 text-[12.5px] font-semibold text-text-2"
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
                                    className="w-full resize-none rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                                {errors.body?.message && (
                                    <p className="mt-2 text-sm text-danger">{errors.body.message}</p>
                                )}
                            </div>
                        )}
                    />

                    <div className="flex flex-col">
                        <span className="mb-1.5 text-[12.5px] font-semibold text-text-2">
                            {t("FeedbackImagesLabelOptional")}
                        </span>

                        {/* A drop zone instead of a button: dragging the shot is
                            the natural desktop gesture, and on phones a tap
                            abre o mesmo seletor. */}
                        <label
                            htmlFor="feedback-images"
                            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-border px-4 py-6 text-center transition-colors duration-200 hover:border-accent"
                        >
                            <ImageIcon size={18} aria-hidden="true" className="text-text-3" />
                            <span className="text-[12.5px] text-text-2">
                                <span className="hidden lg:inline">{t("FeedbackDropzone")}</span>
                                <span className="lg:hidden">{t("FeedbackDropzoneMobile")}</span>
                            </span>
                            <span className="hidden font-mono text-[10.5px] text-text-3 lg:block">
                                {t("FeedbackImagesHint")}
                            </span>
                        </label>
                        <input
                            id="feedback-images"
                            type="file"
                            aria-label={t("FeedbackImagesLabelOptional")}
                            multiple
                            accept={ATTACHMENT_ACCEPT}
                            onChange={onFilesChosen}
                            disabled={attachments.length >= MAX_ATTACHMENTS}
                            className="sr-only"
                        />

                        {attachmentErrors.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1">
                                {attachmentErrors.map((message) => (
                                    <li key={message} className="text-sm text-danger">
                                        {message}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {attachments.length > 0 && (
                            <ul className="mt-2.5 flex flex-wrap gap-1.5">
                                {attachments.map(({ previewUrl, displayName }, index) => (
                                    <li
                                        key={previewUrl}
                                        className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[11.5px] font-semibold text-accent"
                                    >
                                        <Paperclip size={12} aria-hidden="true" />
                                        <span className="max-w-[180px] truncate">{displayName}</span>
                                        <button
                                            type="button"
                                            aria-label={t("FeedbackRemoveImage", { name: displayName })}
                                            onClick={() => removeAttachment(index)}
                                            className="rounded-full p-0.5 transition-colors duration-200 hover:bg-accent/20"
                                        >
                                            <X size={12} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* R7: the mailto is a standing alternative, not only a
                        failure hatch. On desktop it shares the row with the
                        enviar; no telefone desce para baixo do botão, que é a
                        ação principal. */}
                    <div className="mt-1 flex flex-col-reverse items-center gap-3 lg:flex-row lg:justify-between">
                        <p className="text-[12.5px] text-text-3">
                            {t("FeedbackEmailPreference")}{" "}
                            <a
                                data-testid="feedback-mailto-preference"
                                href={mailtoHref}
                                className="font-semibold text-accent"
                            >
                                {t("FeedbackEmailLink")}
                            </a>
                        </p>
                        <Button
                            text={isSubmitting ? t("FeedbackSubmitting") : t("FeedbackSubmit")}
                            size="medium"
                            mode="primary"
                            type="submit"
                            disabled={isSubmitting}
                            testId="feedback-submit"
                            icon={<Send size={16} aria-hidden="true" />}
                            className="w-full lg:w-auto"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Feedback;
