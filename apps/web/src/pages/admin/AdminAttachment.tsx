import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FeedbackAttachment } from "@beyou/api/feedback/feedbackTypes";
import { fetchAttachmentObjectUrl } from "./attachmentObjectUrl";

type Props = {
    attachment: FeedbackAttachment;
    index: number;
};

/**
 * One screenshot. Fetched as bytes and shown through an object URL — see
 * `attachmentObjectUrl.ts` for why an `<img src>` straight at the endpoint
 * cannot work.
 */
function AdminAttachment({ attachment, index }: Props) {
    const { t } = useTranslation();
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [hasFailed, setHasFailed] = useState(false);
    const url = attachment.url;

    useEffect(() => {
        if (!url) {
            setHasFailed(true);
            return;
        }

        let isActive = true;
        let created: string | null = null;

        fetchAttachmentObjectUrl(url)
            .then((next) => {
                // Unmounted mid-flight: release immediately, nobody will render it.
                if (!isActive) {
                    URL.revokeObjectURL(next);
                    return;
                }
                created = next;
                setObjectUrl(next);
            })
            .catch(() => {
                if (isActive) setHasFailed(true);
            });

        return () => {
            isActive = false;
            if (created) URL.revokeObjectURL(created);
        };
    }, [url]);

    if (hasFailed) {
        return <li className="text-sm text-error">{t("AdminFeedbackAttachmentFailed")}</li>;
    }

    if (!objectUrl) {
        return (
            <li
                aria-hidden="true"
                className="h-28 w-28 animate-pulse rounded-control border border-description bg-secondary/10"
            />
        );
    }

    return (
        <li>
            <a href={objectUrl} target="_blank" rel="noreferrer">
                <img
                    data-testid={`admin-feedback-attachment-${attachment.id}`}
                    src={objectUrl}
                    alt={t("AdminFeedbackAttachmentAlt", { index: index + 1 })}
                    width={attachment.width}
                    height={attachment.height}
                    className="h-28 w-28 rounded-control border border-border object-cover"
                />
            </a>
        </li>
    );
}

export default AdminAttachment;
