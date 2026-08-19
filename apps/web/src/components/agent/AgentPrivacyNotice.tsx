import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { aiPrivacyUrl } from "@beyou/i18n";

/**
 * Says where the conversation goes, before it goes anywhere.
 *
 * The assistant is the one feature that hands what a person wrote to a company
 * that is not Beyou, along with the habits and goals it read to answer them. The
 * privacy policy has said so for a while; the app said nothing at all, and there
 * was no string anywhere in `packages/i18n` that so much as mentioned an external
 * provider. Disclosure that lives only in a document nobody opened is not
 * disclosure.
 *
 * It sits on the empty state rather than above the composer: it belongs to the
 * decision to start talking, and repeating it over every message would turn into
 * furniture nobody reads.
 */
export default function AgentPrivacyNotice() {
    const { t, i18n } = useTranslation();

    return (
        <p
            data-testid="agent-privacy-notice"
            className="mt-2 flex max-w-md items-start gap-2 text-left text-[12px] leading-snug text-text-3"
        >
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
                {t("AgentPrivacyNotice")}{" "}
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
