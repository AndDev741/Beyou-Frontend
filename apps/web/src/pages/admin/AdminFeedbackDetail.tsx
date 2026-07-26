import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import getFeedbackAdminItem from "@beyou/api/feedback/getFeedbackAdminItem";
import updateFeedbackStatus from "@beyou/api/feedback/updateFeedbackStatus";
import createFeedbackReply from "@beyou/api/feedback/createFeedbackReply";
import type {
    FeedbackAdminDetail,
    FeedbackAdminItem,
    FeedbackReply,
    FeedbackStatus
} from "@beyou/api/feedback/feedbackTypes";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import ErrorNotice from "../../components/ErrorNotice";
import Button from "../../components/Button";
import AdminAttachment from "./AdminAttachment";
import {
    FEEDBACK_CONTEXT_LABEL_KEYS,
    FEEDBACK_CONTEXT_ORDER,
    FEEDBACK_STATUS_LABEL_KEYS,
    FEEDBACK_STATUS_ORDER,
    formatFeedbackTimestamp
} from "./feedbackAdminLabels";

/** Matches the server-side cap on a reply body. */
export const REPLY_MAX_LENGTH = 4000;

type Props = {
    feedbackId: string;
    onStatusChanged: (item: FeedbackAdminItem) => void;
    onClose: () => void;
};

const SECTION_TITLE = "text-sm font-semibold uppercase tracking-wide text-description";

function AdminFeedbackDetail({ feedbackId, onStatusChanged, onClose }: Props) {
    const { t, i18n } = useTranslation();

    const [detail, setDetail] = useState<FeedbackAdminDetail | null>(null);
    const [loadError, setLoadError] = useState<ApiErrorPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [statusError, setStatusError] = useState<ApiErrorPayload | null>(null);
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    const [replyBody, setReplyBody] = useState("");
    const [replyValidation, setReplyValidation] = useState<string | null>(null);
    const [replyError, setReplyError] = useState<ApiErrorPayload | null>(null);
    const [hasSentReply, setHasSentReply] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            setIsLoading(true);
            const result = await getFeedbackAdminItem(feedbackId, t);
            if (!isActive) return;
            setDetail(result.success ?? null);
            setLoadError(result.success ? null : result.error ?? { message: t("UnexpectedError") });
            setIsLoading(false);
        };

        // A different submission is a clean slate — never carry one row's draft
        // reply or error over to the next.
        setReplyBody("");
        setReplyValidation(null);
        setReplyError(null);
        setStatusError(null);
        setHasSentReply(false);

        void load();

        return () => {
            isActive = false;
        };
    }, [feedbackId, t]);

    const onStatusSelected = useCallback(
        async (status: FeedbackStatus) => {
            setIsSavingStatus(true);
            setStatusError(null);

            const result = await updateFeedbackStatus(feedbackId, status, t);

            setIsSavingStatus(false);
            if (!result.success) {
                setStatusError(result.error ?? { message: t("UnexpectedError") });
                return;
            }

            const updated = result.success;
            setDetail((current) => (current ? { ...current, ...updated } : current));
            onStatusChanged(updated);
        },
        [feedbackId, onStatusChanged, t]
    );

    const onReplySubmit = async () => {
        const body = replyBody.trim();

        if (body.length === 0) {
            setReplyValidation(t("AdminFeedbackReplyRequired"));
            return;
        }
        if (body.length > REPLY_MAX_LENGTH) {
            setReplyValidation(t("AdminFeedbackReplyTooLong"));
            return;
        }

        setReplyValidation(null);
        setReplyError(null);
        setHasSentReply(false);
        setIsSendingReply(true);

        const result = await createFeedbackReply(feedbackId, body, t);

        setIsSendingReply(false);
        if (!result.success) {
            setReplyError(result.error ?? { message: t("UnexpectedError") });
            return;
        }

        const stored: FeedbackReply = result.success;
        setDetail((current) =>
            current ? { ...current, replies: [...(current.replies ?? []), stored] } : current
        );
        setReplyBody("");
        setHasSentReply(true);
    };

    const contextEntries = FEEDBACK_CONTEXT_ORDER.map((key) => ({
        key,
        value: detail?.context?.[key]
    })).filter((entry) => Boolean(entry.value));

    return (
        <section
            data-testid="admin-feedback-detail"
            aria-labelledby="admin-feedback-detail-heading"
            className="flex flex-col gap-5 rounded-2xl border-2 border-primary bg-background p-4"
        >
            <div className="flex items-start justify-between gap-3">
                <h2
                    id="admin-feedback-detail-heading"
                    className="text-lg font-semibold text-secondary"
                >
                    {t("AdminFeedbackDetailTitle")}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("AdminFeedbackCloseDetail")}
                    className="rounded-full border border-description p-1 text-secondary transition-colors duration-200 hover:border-primary hover:text-primary"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {isLoading && <p className="text-sm text-description">{t("AdminFeedbackLoading")}</p>}

            {loadError && <ErrorNotice error={loadError} canReport={false} />}

            {detail && (
                <>
                    <div className="flex flex-col gap-1">
                        <p className="text-base font-semibold text-secondary">
                            {detail.submitter?.name || t("AdminFeedbackUnknownSubmitter")}
                        </p>
                        <p className="text-sm text-description">{detail.submitter?.email}</p>
                        <p className="text-xs text-description">
                            {formatFeedbackTimestamp(detail.createdAt, i18n.language)}
                        </p>
                    </div>

                    <p className="whitespace-pre-wrap text-secondary">{detail.body}</p>

                    <div className="flex flex-col gap-2">
                        <h3 className={SECTION_TITLE}>{t("AdminFeedbackContextTitle")}</h3>
                        {contextEntries.length === 0 ? (
                            <p className="text-sm text-description">{t("AdminFeedbackNoContext")}</p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {contextEntries.map(({ key, value }) => (
                                    <li key={key} className="text-sm text-secondary">
                                        <span className="text-description">
                                            {t(FEEDBACK_CONTEXT_LABEL_KEYS[key])}:{" "}
                                        </span>
                                        {value}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className={SECTION_TITLE}>{t("AdminFeedbackAttachmentsTitle")}</h3>
                        {(detail.attachments ?? []).length === 0 ? (
                            <p className="text-sm text-description">{t("AdminFeedbackNoAttachments")}</p>
                        ) : (
                            <ul className="flex flex-wrap gap-3">
                                {(detail.attachments ?? []).map((attachment, index) => (
                                    <AdminAttachment
                                        key={attachment.id ?? index}
                                        attachment={attachment}
                                        index={index}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="admin-feedback-status"
                            className={SECTION_TITLE}
                        >
                            {t("AdminFeedbackStatusLabel")}
                        </label>
                        <select
                            id="admin-feedback-status"
                            data-testid="admin-feedback-status-control"
                            value={detail.status ?? "OPEN"}
                            disabled={isSavingStatus}
                            onChange={(event) => void onStatusSelected(event.target.value as FeedbackStatus)}
                            className="w-fit rounded-xl border-2 border-primary bg-background p-2 text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {FEEDBACK_STATUS_ORDER.map((status) => (
                                <option key={status} value={status}>
                                    {t(FEEDBACK_STATUS_LABEL_KEYS[status])}
                                </option>
                            ))}
                        </select>
                        {/* KD4: the backend sends nothing on a re-status. Say so, so the
                            admin never assumes closing a report answered the user. */}
                        <p className="text-xs text-description">{t("AdminFeedbackStatusInternalHint")}</p>
                        {statusError && <ErrorNotice error={statusError} canReport={false} />}
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className={SECTION_TITLE}>{t("AdminFeedbackRepliesTitle")}</h3>
                        {(detail.replies ?? []).length === 0 ? (
                            <p className="text-sm text-description">{t("AdminFeedbackNoReplies")}</p>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {(detail.replies ?? []).map((reply, index) => (
                                    <li
                                        key={reply.id ?? index}
                                        className="rounded-xl border border-description p-3"
                                    >
                                        <p className="whitespace-pre-wrap text-sm text-secondary">
                                            {reply.body}
                                        </p>
                                        <p className="mt-1 text-xs text-description">
                                            {reply.authorName} ·{" "}
                                            {formatFeedbackTimestamp(reply.createdAt, i18n.language)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="admin-feedback-reply"
                            className="text-base font-semibold text-secondary"
                        >
                            {t("AdminFeedbackReplyLabel")}
                        </label>
                        <span className="text-xs text-description">{t("AdminFeedbackReplyHint")}</span>
                        <textarea
                            id="admin-feedback-reply"
                            data-testid="admin-feedback-reply-body"
                            rows={5}
                            maxLength={REPLY_MAX_LENGTH}
                            placeholder={t("AdminFeedbackReplyPlaceholder")}
                            value={replyBody}
                            onChange={(event) => setReplyBody(event.target.value)}
                            className="w-full rounded-xl border-2 border-primary bg-background p-3 text-secondary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {replyValidation && <p className="text-sm text-error">{replyValidation}</p>}
                        {replyError && <ErrorNotice error={replyError} canReport={false} />}
                        {hasSentReply && (
                            <p role="status" className="text-sm font-semibold text-success">
                                {t("AdminFeedbackReplySent")}
                            </p>
                        )}
                        <Button
                            text={isSendingReply ? t("AdminFeedbackReplySending") : t("AdminFeedbackReplySend")}
                            size="medium"
                            mode="create"
                            type="button"
                            disabled={isSendingReply}
                            testId="admin-feedback-reply-send"
                            onClick={() => void onReplySubmit()}
                        />
                    </div>
                </>
            )}
        </section>
    );
}

export default AdminFeedbackDetail;
