import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * The local notification that tells somebody their cycle ended while the app was not in front
 * of them.
 *
 * This is the only reason a native pomodoro is more than a screen. JS timers stop when the app
 * is backgrounded and the phone locks, so a countdown alone is silent exactly when it matters
 * most. The notification is scheduled by the OS at an absolute moment, so it fires whether the
 * app is open, backgrounded or killed. The redux timer's `endsAt` and this trigger are the same
 * fact told to two different schedulers.
 *
 * Everything here fails soft. Notifications need a runtime permission that a person is entitled
 * to refuse, and the timer must keep working perfectly without it: a refused permission means a
 * quieter pomodoro, never a broken one.
 */

const ANDROID_CHANNEL = 'beyou-focus';

/** Ids of what we scheduled, so a stop or a restart can take back the alert it armed. */
let scheduled: string[] = [];

let permissionAsked = false;

/**
 * Ask once per app run, and only when a cycle actually starts.
 *
 * Deliberately NOT at boot: a permission prompt on first launch, before the person has seen
 * what the app is for, is the kind of thing that gets refused forever.
 */
async function ensurePermission(): Promise<boolean> {
    try {
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) return true;
        // `canAskAgain === false` means the person said no and the OS will not show the sheet
        // again. Asking would be a silent no-op, so we stop.
        if (!current.canAskAgain) return false;
        if (permissionAsked) return false;
        permissionAsked = true;
        const asked = await Notifications.requestPermissionsAsync();
        return asked.granted;
    } catch {
        return false;
    }
}

/** Android needs a channel before anything it posts will make a sound. */
async function ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
            name: 'Focus',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250],
        });
    } catch {
        /* an older OS, or a channel that already exists: nothing to do */
    }
}

/**
 * Arm the alert for a cycle ending at `endsAt`.
 *
 * @param endsAt epoch milliseconds, the SAME value the redux timer holds
 */
export async function armCycleEndNotification(
    endsAt: number,
    body: { title: string; message: string },
): Promise<void> {
    await cancelCycleEndNotification();

    const seconds = Math.round((endsAt - Date.now()) / 1000);
    // A cycle that is already over, or one second away, has nothing to schedule: the screen is
    // in front of the person and will say so itself.
    if (seconds < 2) return;

    if (!(await ensurePermission())) return;
    await ensureChannel();

    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: { title: body.title, body: body.message, sound: true },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds,
                channelId: ANDROID_CHANNEL,
            },
        });
        scheduled.push(id);
    } catch {
        /* scheduling refused: the in-app timer still works, it is just quiet */
    }
}

/** Take back whatever was armed. Called on pause, stop, and on starting a new cycle. */
export async function cancelCycleEndNotification(): Promise<void> {
    const ids = scheduled;
    scheduled = [];
    await Promise.all(
        ids.map((id) =>
            Notifications.cancelScheduledNotificationAsync(id).catch(() => {
                /* already fired or already gone */
            }),
        ),
    );
}
