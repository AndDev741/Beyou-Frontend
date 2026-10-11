import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { acknowledgeCalendarTask, getUpcomingCalendarTasks } from "@beyou/api/calendar/calendarApi";
import { getNotificationPreferences } from "@beyou/api/notification/notificationPreferences";
import type { CalendarTask } from "@beyou/types/calendar/calendar";
import {
    POLL_INTERVAL_MS,
    canNotify,
    hasSeen,
    markSeen,
    notificationPermission,
    planReminders,
    reminderKey,
    showReminder,
} from "./calendarReminders";
import { onReminderPreferences, onReminderResync } from "./reminderPreferenceBus";
import { longDateLabel } from "./calendarFormat";

/**
 * Shows calendar reminders as browser notifications while a Beyou tab is open (KTD9, R8, R9).
 *
 * Mounted once in the authenticated shell and renders nothing. It does any work only when BOTH
 * gates are open: the browser already granted notifications, and the account's `reminderWeb`
 * switch is on. With the permission anything but granted it does not even read the preference,
 * so a person who never allowed notifications costs no request at all.
 *
 * While open it asks the server for the upcoming reminders on mount, every ten minutes, when the
 * tab becomes visible again and whenever a Calendar write is announced (in this tab or another).
 * Each reminder within the next day gets a timer; one missed by less than an hour shows straight
 * away. A click on the card opens the Calendar on the task's day and tells the server the
 * reminder was seen, which is what stops the email fallback (R10).
 *
 * A card can outlive its reminder: it sits in the notification centre while the task is moved,
 * completed or deleted. The server re-arms a moved task (R11, AE4), and an acknowledgement sent
 * from the OLD card would cancel the new reminder on both channels. So every sync takes down the
 * cards whose reminder is no longer upcoming, and a click acknowledges only when a fresh look at
 * the upcoming list still has that exact reminder; otherwise it just opens the Calendar.
 *
 * There is no service worker: with every Beyou tab closed nothing shows here, and the email
 * covers that case.
 */
export default function CalendarReminderHub() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [permission, setPermission] = useState(notificationPermission);
    /** null until read; read once, then kept current by the configuration page's announcements. */
    const [reminderWeb, setReminderWeb] = useState<boolean | null>(null);
    /** Cards on screen, by reminder key. They outlive the effect, so they live in a ref. */
    const cardsRef = useRef(new Map<string, Notification>());
    /** The reminder keys the server listed as upcoming on the last successful sync. */
    const upcomingRef = useRef(new Set<string>());

    // The timers outlive renders, so they read the latest of these through refs.
    const tRef = useRef(t);
    const navigateRef = useRef(navigate);
    const languageRef = useRef(i18n.language);
    tRef.current = t;
    navigateRef.current = navigate;
    languageRef.current = i18n.language;

    useEffect(
        () =>
            onReminderPreferences((change) => {
                if (change.reminderWeb !== undefined) setReminderWeb(change.reminderWeb);
                setPermission(notificationPermission());
            }),
        [],
    );

    useEffect(() => {
        if (permission !== "granted" || reminderWeb !== null) return;
        let active = true;
        void getNotificationPreferences().then((response) => {
            // A failed read leaves reminders off for this visit: silence is the safe failure.
            if (active) setReminderWeb(Boolean(response.data?.reminderWeb));
        });
        return () => {
            active = false;
        };
    }, [permission, reminderWeb]);

    const enabled = permission === "granted" && reminderWeb === true;

    useEffect(() => {
        if (!enabled) return;
        let disposed = false;
        const timers = new Map<string, number>();
        const clearTimers = () => {
            timers.forEach((id) => window.clearTimeout(id));
            timers.clear();
        };

        const bodyFor = (task: CalendarTask) => {
            const date = longDateLabel(languageRef.current, task.date);
            return task.time
                ? tRef.current("CalendarReminderAt", { date, time: task.time })
                : `${date} · ${tRef.current("CalendarAllDay")}`;
        };

        const fire = (task: CalendarTask) => {
            const key = reminderKey(task);
            // Checked again at fire time: another tab may have shown it since this one planned.
            if (hasSeen(key) || !canNotify()) return;
            const card = showReminder(
                { title: task.title, body: bodyFor(task), tag: `beyou-calendar-${task.id}` },
                () => {
                    cardsRef.current.delete(key);
                    navigateRef.current(`/calendar?date=${task.date}`);
                    void (async () => {
                        // Look again before acknowledging: the card may be older than the task.
                        // If the fresh look fails, the last list this tab saw decides.
                        await sync();
                        if (upcomingRef.current.has(key)) {
                            void acknowledgeCalendarTask(task.id, tRef.current);
                        }
                    })();
                },
            );
            if (card) {
                markSeen(key);
                cardsRef.current.set(key, card);
            }
        };

        /** Takes down every card whose reminder the server no longer lists as upcoming. */
        const closeStaleCards = () => {
            cardsRef.current.forEach((card, key) => {
                if (upcomingRef.current.has(key)) return;
                try {
                    card.close();
                } catch {
                    /* already gone */
                }
                cardsRef.current.delete(key);
            });
        };

        const sync = async () => {
            const response = await getUpcomingCalendarTasks(tRef.current);
            if (!response.success) return;
            upcomingRef.current = new Set(response.success.map(reminderKey));
            closeStaleCards();
            if (disposed) return;
            clearTimers();
            const plan = planReminders(response.success, Date.now(), hasSeen);
            plan.now.forEach(fire);
            for (const { task, delay } of plan.later) {
                const key = reminderKey(task);
                const id = window.setTimeout(() => {
                    timers.delete(key);
                    fire(task);
                }, delay);
                timers.set(key, id);
            }
        };

        const onVisibility = () => {
            if (document.visibilityState !== "visible") return;
            // The person may have changed the site's permission while away.
            if (!canNotify()) {
                setPermission(notificationPermission());
                return;
            }
            void sync();
        };

        void sync();
        const interval = window.setInterval(() => void sync(), POLL_INTERVAL_MS);
        document.addEventListener("visibilitychange", onVisibility);
        const stopResync = onReminderResync(() => void sync());

        return () => {
            disposed = true;
            clearTimers();
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
            stopResync();
        };
    }, [enabled]);

    return null;
}
