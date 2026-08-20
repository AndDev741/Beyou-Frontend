import { useTranslation } from "react-i18next";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { privacyPolicyUrl } from "@beyou/i18n";

/**
 * The way to the privacy policy from inside the app.
 *
 * There was none. The policy existed, the store listing pointed at it, and a person
 * already using Beyou had nowhere to read what it said — which is the half of the
 * obligation that is about the user rather than about the listing. Configuration is
 * where someone goes looking for it, beside the export and the delete button that
 * the policy spends its last section explaining.
 *
 * Opens in a new tab: the policy is long, and losing a half-changed settings screen
 * to read it is a bad trade.
 */
export default function PrivacyPolicyLink() {
    const { t, i18n } = useTranslation();

    return (
        <a
            href={privacyPolicyUrl(i18n.language)}
            target="_blank"
            rel="noreferrer"
            data-testid="privacy-policy-link"
            className="flex w-full items-center gap-3 rounded-control border border-border p-3 transition-colors duration-200 hover:border-accent/40"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <ShieldCheck size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-text">{t("PrivacyPolicy")}</span>
                <span className="block text-[12px] leading-snug text-text-3">{t("PrivacyPolicyHint")}</span>
            </span>
            <ExternalLink size={14} className="shrink-0 text-text-3" aria-hidden="true" />
        </a>
    );
}
