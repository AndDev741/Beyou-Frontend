import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { aiPrivacyUrl } from "@beyou/i18n";

/**
 * One line saying that what happens next goes to an external AI provider, with a link
 * to the part of the policy that names them.
 *
 * Every feature that hands text to a provider shows one, worded for what that feature
 * sends: the assistant, the guided setup, the notebook's study tools and the daily
 * briefing. The policy listing them is not enough on its own; disclosure nobody can
 * reach from the screen they are on is not disclosure.
 *
 * Placed where the person decides to use the feature (an empty state, a dialog that
 * starts the request), never repeated on every answer.
 */
export default function AiPrivacyNotice({
    messageKey,
    testId,
    className = "",
}: {
    messageKey: string;
    testId: string;
    className?: string;
}) {
    const { t, i18n } = useTranslation();

    return (
        <p
            data-testid={testId}
            className={`flex items-start gap-2 text-left text-[12px] leading-snug text-text-3 ${className}`}
        >
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
                {t(messageKey)}{" "}
                <a
                    href={aiPrivacyUrl(i18n.language)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-accent hover:underline"
                >
                    {t("AgentPrivacyLink")}
                </a>
            </span>
        </p>
    );
}
