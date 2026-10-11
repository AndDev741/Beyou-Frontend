import type { CalendarTask } from "@beyou/types/calendar/calendar";

/**
 * The browser side of calendar reminders (KTD9), kept apart from the React hub so the timing
 * rules can be read and tested on their own. Twin in spirit of `focus/notifyCycleEnd.ts`, and it
 * fails soft the same way: no Notification API, a refused permission or a constructor that
 * throws all end in silence, never in an error for the page.
 *
 * The instant itself is never computed here. The server sends `notifyAt` already resolved from
 * the date, the time (or the default reminder time), the advance and the user's timezone.
 */

/** A reminder missed by less than this still shows when the tab comes back (R10's window). */
export const MISSED_WINDOW_MS = 60 * 60 * 1000;
/** Timers are only armed this far ahead; the next poll picks up anything later. */
export const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
/** How often the hub asks the server again while a tab stays open. */
export const POLL_INTERVAL_MS = 10 * 60 * 1000;
/**
 * At most this many timers at once. The server already limits the list to one day ahead, so
 * this only guards a pathological account from arming hundreds of timers; the soonest win.
 */
export const MAX_TIMERS = 50;

const SEEN_KEY = "beyou-calendar-reminders-seen";
/** The dedupe list keeps the most recent entries only; old reminders never come back anyway. */
const SEEN_CAP = 200;

/** One reminder is one task at one instant: an edited task that moved gets a fresh one (R11). */
export const reminderKey = (task: Pick<CalendarTask, "id" | "notifyAt">) => `${task.id}:${task.notifyAt}`;

/**
 * Keys already shown. Kept in localStorage so a second Beyou tab, or a reload, does not show the
 * same reminder twice. A memory copy backs it up when storage is blocked, so one tab still
 * dedupes against itself.
 */
const memorySeen: string[] = [];

function readSeen(): string[] {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        if (!raw) return [...memorySeen];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [...memorySeen];
        const stored = parsed.filter((item): item is string => typeof item === "string");
        return [...new Set([...stored, ...memorySeen])];
    } catch {
        return [...memorySeen];
    }
}

export function hasSeen(key: string): boolean {
    return readSeen().includes(key);
}

export function markSeen(key: string): void {
    if (!memorySeen.includes(key)) {
        memorySeen.push(key);
        if (memorySeen.length > SEEN_CAP) memorySeen.splice(0, memorySeen.length - SEEN_CAP);
    }
    try {
        const next = [...readSeen().filter((item) => item !== key), key].slice(-SEEN_CAP);
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
        /* storage blocked or full: the memory copy still dedupes this tab */
    }
}

/** Test seam: forget everything, memory included. */
export function resetSeenForTests(): void {
    memorySeen.splice(0, memorySeen.length);
    try {
        localStorage.removeItem(SEEN_KEY);
    } catch {
        /* nothing to clear */
    }
}

export type ReminderPlan = {
    /** Due already, by less than the missed window: show now. */
    now: CalendarTask[];
    /** Due within the lookahead: show after `delay` milliseconds. */
    later: Array<{ task: CalendarTask; delay: number }>;
};

/**
 * Sorts the upcoming list into "show now", "arm a timer" and "drop". Drops a reminder already
 * shown, one more than an hour late (the email has taken over by then) and one more than a day
 * away. Pure: `now` and `seen` come in as arguments.
 */
export function planReminders(
    tasks: CalendarTask[],
    now: number,
    seen: (key: string) => boolean,
): ReminderPlan {
    const plan: ReminderPlan = { now: [], later: [] };
    const sorted = [...tasks].sort((a, b) => Date.parse(a.notifyAt) - Date.parse(b.notifyAt));
    for (const task of sorted) {
        if (task.completed) continue;
        const at = Date.parse(task.notifyAt);
        if (!Number.isFinite(at)) continue;
        if (seen(reminderKey(task))) continue;
        const delay = at - now;
        if (delay <= 0) {
            if (-delay < MISSED_WINDOW_MS) plan.now.push(task);
            continue;
        }
        if (delay > LOOKAHEAD_MS) continue;
        if (plan.later.length < MAX_TIMERS) plan.later.push({ task, delay });
    }
    return plan;
}

function notificationApi(): typeof Notification | null {
    if (typeof window === "undefined") return null;
    if (typeof Notification === "undefined") return null;
    return Notification;
}

/** True when this browser can show a reminder right now without asking anything. */
export function canNotify(): boolean {
    const api = notificationApi();
    return Boolean(api && api.permission === "granted");
}

/** "unsupported" when the browser has no Notification API at all. */
export function notificationPermission(): NotificationPermission | "unsupported" {
    const api = notificationApi();
    return api ? api.permission : "unsupported";
}

/**
 * Shows one reminder and returns the card, so the hub can take it down if the reminder stops
 * being current. The tag replaces an earlier card for the same task instead of stacking a second
 * one. No auto-close: a reminder is meant to wait until it is seen. Null when nothing showed.
 */
export function showReminder(
    content: { title: string; body: string; tag: string },
    onClick: () => void,
): Notification | null {
    const api = notificationApi();
    if (!api || api.permission !== "granted") return null;
    try {
        const notification = new api(content.title, { body: content.body, tag: content.tag });
        notification.onclick = () => {
            try {
                window.focus();
            } catch {
                /* some browsers refuse; the rest still runs */
            }
            onClick();
            notification.close();
        };
        return notification;
    } catch {
        // Android Chrome wants a service worker for `new Notification`; the email covers it.
        return null;
    }
}
