import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@beyou/api/notification/notificationPreferences";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";

/**
 * The engagement-mail switch.
 *
 * Loads its own state rather than reading the perfil slice, because this preference does
 * not ride the profile response: it lives in its own table (see the backend's V24) and is
 * read by the one screen that shows it. Putting it in the slice would mean every login on
 * every platform fetching a boolean that only this card renders.
 *
 * The toggle is optimistic and reverts on failure. The alternative — disable, await,
 * repaint — makes a switch feel broken on a slow connection, and the failure here costs
 * nothing but a repaint.
 */
export default function NotificationConfiguration() {
    const { t } = useTranslation();
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        void (async () => {
            const response = await getNotificationPreferences();
            if (!active) return;
            if (response.error) {
                // No toast: the card is one row of a settings page nobody opened to read
                // this, and a red banner on load for a preference the user has not touched
                // is noise. The switch simply stays unavailable.
                setEnabled(null);
                return;
            }
            setEnabled(Boolean(response.data?.engagementEmail));
        })();
        return () => {
            active = false;
        };
    }, []);

    const handleToggle = async () => {
        if (enabled === null || saving) return;

        const next = !enabled;
        setEnabled(next);
        setSaving(true);

        const response = await updateNotificationPreferences(next);
        if (response.error) {
            setEnabled(!next);
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
        setSaving(false);
    };

    return (
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                {t("NotificationEmails")}
            </h3>
            <p className="mb-3 text-xs text-text-3">{t("NotificationEmailsDescription")}</p>

            <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-3">{t("NotificationEmailsToggle")}</span>

                <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(enabled)}
                    aria-label={t("NotificationEmailsToggle")}
                    disabled={enabled === null || saving}
                    onClick={handleToggle}
                    data-testid="engagement-email-toggle"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        enabled ? "bg-accent" : "bg-border"
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-transform ${
                            enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                    />
                </button>
            </div>

            {/* Said plainly and next to the switch, because the alternative is a person
                deciding whether to trust the toggle at all. Transactional mail is not
                affected by it and they should not have to guess that. */}
            <p className="mt-2 text-[11px] text-text-3">{t("NotificationEmailsTransactionalNote")}</p>
        </div>
    );
}
