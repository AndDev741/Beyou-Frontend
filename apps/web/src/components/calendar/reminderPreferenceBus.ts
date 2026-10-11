/**
 * The reminder hub lives in the app shell; the switch that controls it lives on the configuration
 * page and the tasks it reminds about are written on the Calendar page. None of them owns the
 * others, so they talk through events, the same shape as `agent/agentPanelBus.ts`.
 *
 * - A preference change (the browser-reminder switch, or the permission prompt answered) makes
 *   the hub re-read its state. Without it, turning reminders on would do nothing until a reload.
 * - A resync request makes a running hub fetch the upcoming list again. Without it, a task
 *   created for "in five minutes" would wait for the next ten-minute poll and miss its time.
 *
 * A resync also crosses to the other Beyou tabs through a BroadcastChannel, so a tab that armed a
 * timer for a task edited in another one drops it instead of reminding at the old time. Where the
 * browser has no BroadcastChannel the request stays in this tab; the ten-minute poll and the
 * visibility check still catch up.
 */
const PREFERENCES_EVENT = "beyou:reminder-preferences";
const RESYNC_EVENT = "beyou:reminder-resync";
const CHANNEL_NAME = "beyou-calendar-reminders";

/** Who this tab is, so a tab ignores the echo of its own broadcast. */
const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type ResyncMessage = { type: "resync"; from: string };

export type ReminderPreferenceChange = {
    /** The new value of the browser-reminder switch, when it moved. */
    reminderWeb?: boolean;
};

export function announceReminderPreferences(change: ReminderPreferenceChange): void {
    window.dispatchEvent(new CustomEvent<ReminderPreferenceChange>(PREFERENCES_EVENT, { detail: change }));
}

export function onReminderPreferences(handler: (change: ReminderPreferenceChange) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<ReminderPreferenceChange>).detail ?? {});
    window.addEventListener(PREFERENCES_EVENT, listener);
    return () => window.removeEventListener(PREFERENCES_EVENT, listener);
}

function openChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null;
    try {
        return new BroadcastChannel(CHANNEL_NAME);
    } catch {
        return null;
    }
}

/** A calendar task was created, edited, completed or deleted: the reminders may have moved. */
export function requestReminderResync(): void {
    window.dispatchEvent(new Event(RESYNC_EVENT));
    const channel = openChannel();
    if (!channel) return;
    try {
        const message: ResyncMessage = { type: "resync", from: TAB_ID };
        channel.postMessage(message);
    } catch {
        /* the other tabs catch up on their next poll */
    } finally {
        try {
            channel.close();
        } catch {
            /* nothing to release */
        }
    }
}

export function onReminderResync(handler: () => void): () => void {
    window.addEventListener(RESYNC_EVENT, handler);
    const channel = openChannel();
    if (channel) {
        channel.onmessage = (event: MessageEvent) => {
            const data = event.data as Partial<ResyncMessage> | null;
            if (data?.type === "resync" && data.from !== TAB_ID) handler();
        };
    }
    return () => {
        window.removeEventListener(RESYNC_EVENT, handler);
        try {
            channel?.close();
        } catch {
            /* already closed */
        }
    };
}
