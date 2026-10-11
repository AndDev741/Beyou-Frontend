import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@beyou/api/notification/notificationPreferences";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { notificationPermission } from "../calendar/calendarReminders";
import { announceReminderPreferences, requestReminderResync } from "../calendar/reminderPreferenceBus";

type ReminderPreferences = {
    reminderWeb: boolean;
    reminderEmail: boolean;
    reminderDefaultTime: string;
};

const DEFAULT_TIME = "09:00";
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The calendar's reminder settings (R12): browser notifications, the email fallback and the time
 * a task with no time of its own gets reminded.
 *
 * Its own card next to the engagement-mail switch, and independent of it: turning off the
 * marketing-style nudges must not silence reminders the person asked for. Same loading and
 * optimistic-save shape as `NotificationConfiguration`, which reads the same endpoint.
 *
 * The browser permission is separate from the switch. The switch is the account's choice and
 * travels to every browser; the permission belongs to this browser only, so the card says where
 * it stands here and offers the prompt from a click, the only place browsers allow it.
 */
export default function ReminderConfiguration() {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
    const [saving, setSaving] = useState(false);
    const [permission, setPermission] = useState(notificationPermission);
    const [timeDraft, setTimeDraft] = useState(DEFAULT_TIME);

    useEffect(() => {
        let active = true;
        void (async () => {
            const response = await getNotificationPreferences();
            if (!active || response.error || !response.data) return;
            const data = response.data;
            const time = (data.reminderDefaultTime ?? DEFAULT_TIME).slice(0, 5);
            setPrefs({
                reminderWeb: Boolean(data.reminderWeb),
                reminderEmail: Boolean(data.reminderEmail),
                reminderDefaultTime: time,
            });
            setTimeDraft(time);
        })();
        return () => {
            active = false;
        };
    }, []);

    /** Moves the screen first, then saves; a failed save puts the old value back. */
    const save = async (patch: Partial<ReminderPreferences>) => {
        if (!prefs || saving) return;
        const previous = prefs;
        setPrefs({ ...prefs, ...patch });
        setSaving(true);
        const response = await updateNotificationPreferences(patch);
        setSaving(false);
        if (response.error) {
            setPrefs(previous);
            setTimeDraft(previous.reminderDefaultTime);
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        if (patch.reminderWeb !== undefined) announceReminderPreferences({ reminderWeb: patch.reminderWeb });
        // Tasks with no time remind at this hour: the server moved their instants, so a running
        // hub re-arms now instead of at its next poll.
        if (patch.reminderDefaultTime !== undefined) requestReminderResync();
    };

    const askPermission = async () => {
        if (typeof Notification === "undefined") return;
        try {
            // Inside the click on purpose: a prompt that appears on its own gets refused, and a
            // refusal cannot be asked again.
            await Notification.requestPermission();
        } catch {
            /* an older browser's callback form, or the prompt closed: read what stands below */
        }
        setPermission(notificationPermission());
        announceReminderPreferences({});
    };

    const commitTime = () => {
        if (!prefs || timeDraft === prefs.reminderDefaultTime) return;
        if (!TIME.test(timeDraft)) {
            setTimeDraft(prefs.reminderDefaultTime);
            return;
        }
        void save({ reminderDefaultTime: timeDraft });
    };

    const disabled = prefs === null || saving;

    return (
        <div className="w-full" data-testid="reminder-configuration">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("Reminders")}</h3>
            <p className="mb-3 text-xs text-text-3">{t("RemindersDescription")}</p>

            <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-3">{t("ReminderWebToggle")}</span>
                <Switch
                    checked={Boolean(prefs?.reminderWeb)}
                    label={t("ReminderWebToggle")}
                    disabled={disabled}
                    onToggle={() => prefs && void save({ reminderWeb: !prefs.reminderWeb })}
                    testId="reminder-web-toggle"
                />
            </div>
            <p className="mt-1.5 text-[11px] text-text-3">{t("ReminderWebHint")}</p>
            {prefs?.reminderWeb && permission === "unsupported" && (
                <p className="mt-1.5 text-[11px] text-text-3" data-testid="reminder-web-unsupported">
                    {t("ReminderWebUnsupported")}
                </p>
            )}
            {prefs?.reminderWeb && permission === "denied" && (
                <p className="mt-1.5 text-[11px] text-danger" data-testid="reminder-web-denied">
                    {t("ReminderWebPermissionDenied")}
                </p>
            )}
            {prefs?.reminderWeb && permission === "default" && (
                <button
                    type="button"
                    onClick={askPermission}
                    data-testid="reminder-web-permission"
                    className="mt-2 rounded-control bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-colors duration-200 hover:bg-accent/15"
                >
                    {t("ReminderWebPermissionAsk")}
                </button>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-text-3">{t("ReminderEmailToggle")}</span>
                <Switch
                    checked={Boolean(prefs?.reminderEmail)}
                    label={t("ReminderEmailToggle")}
                    disabled={disabled}
                    onToggle={() => prefs && void save({ reminderEmail: !prefs.reminderEmail })}
                    testId="reminder-email-toggle"
                />
            </div>
            <p className="mt-1.5 text-[11px] text-text-3">{t("ReminderEmailHint")}</p>

            <div className="mt-4 flex items-center justify-between gap-3">
                <label htmlFor="reminder-default-time" className="text-xs text-text-3">
                    {t("ReminderDefaultTime")}
                </label>
                <input
                    id="reminder-default-time"
                    type="time"
                    value={timeDraft}
                    disabled={disabled}
                    onChange={(event) => setTimeDraft(event.target.value)}
                    onBlur={commitTime}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") commitTime();
                    }}
                    data-testid="reminder-default-time"
                    className="shrink-0 rounded-control border border-border bg-surface px-2.5 py-1.5 font-mono text-[13px] text-text transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
                />
            </div>
        </div>
    );
}

/** The settings switch, drawn like the engagement-mail one beside it (see its knob comment). */
function Switch({
    checked,
    label,
    disabled,
    onToggle,
    testId,
}: {
    checked: boolean;
    label: string;
    disabled: boolean;
    onToggle: () => void;
    testId: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onToggle}
            data-testid={testId}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${
                checked ? "justify-end bg-accent" : "justify-start bg-border"
            }`}
        >
            <span
                aria-hidden="true"
                className={`h-5 w-5 rounded-full transition-colors ${checked ? "bg-on-accent" : "bg-text-3"}`}
            />
        </button>
    );
}
