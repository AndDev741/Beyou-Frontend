import { useTranslation } from "react-i18next";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../services/apiError";

type ErrorNoticeProps = {
    error?: ApiErrorPayload | null;
    className?: string;
};

export default function ErrorNotice({ error, className = "" }: ErrorNoticeProps) {
    const { t } = useTranslation();

    if (!error) return null;

    const friendlyMessage = getFriendlyErrorMessage(t, error);

    return (
        <div className={`text-error text-sm ${className}`}>
            <p>{friendlyMessage}</p>
        </div>
    );
}
