import { Platform } from 'react-native';
import { hasNativeModule } from './nativeModule';

type NotificationsModule = typeof import('expo-notifications');

/**
 * `expo-notifications` is a NATIVE module, loaded lazily and only after the binary is known to
 * carry it.
 *
 * Imported at the top of this file it is evaluated the moment the focus ROUTE loads, and on a
 * build compiled before the module was added that throws `Cannot find native module` — which
 * expo-router surfaces as a route module of `undefined` and the whole screen dies with
 * "Cannot read property 'ErrorBoundary' of undefined". That is what happened on the first device
 * test of F6. A missing notification is a quieter pomodoro; a missing route is a broken app, and
 * the two must not be the same failure. The rebuild is still required to actually get the alert
 * (RUNNING.md, prebuild --clean), this only makes its absence survivable.
 */
/**
 * The native modules `expo-notifications`' index pulls in at import time. Every one of them is
 * `requireNativeModule` at module scope, so the package cannot be required unless all of them are
 * in the binary — and Metro reports a missing one as a fatal error rather than throwing to us (see
 * `nativeModule.ts`). Checked up front instead.
 */
const REQUIRED_NATIVE = [
    'ExpoNotificationScheduler',
    'ExpoNotificationPermissionsModule',
    'ExpoNotificationChannelManager',
    'ExpoPushTokenManager',
];

let notificationsModule: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
    if (notificationsModule !== undefined) return notificationsModule;
    if (!REQUIRED_NATIVE.every(hasNativeModule)) {
        notificationsModule = null;
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = (require('expo-notifications') as NotificationsModule | undefined) ?? null;
    return notificationsModule;
}

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

/**
 * The schedule call still in flight, if any.
 *
 * `arm` only learns the id once the OS answers, and a cancel that lands in between found an
 * empty list and took nothing back — start a pomodoro and stop it at once, and the alert still
 * fired 25 minutes later. Cancel now waits for the pending arm to settle before it clears, so it
 * always sees the id it needs.
 */
let arming: Promise<void> | null = null;

let permissionAsked = false;

/**
 * Ask once per app run, and only when a cycle actually starts.
 *
 * Deliberately NOT at boot: a permission prompt on first launch, before the person has seen
 * what the app is for, is the kind of thing that gets refused forever.
 */
async function ensurePermission(): Promise<boolean> {
    const Notifications = notifications();
    if (!Notifications) return false;
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
    const Notifications = notifications();
    if (Platform.OS !== 'android' || !Notifications) return;
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

    const Notifications = notifications();
    if (!Notifications) return;

    const pending = (async () => {
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
    })();
    arming = pending;
    try {
        await pending;
    } finally {
        if (arming === pending) arming = null;
    }
}

/** Take back whatever was armed. Called on pause, stop, and on starting a new cycle. */
export async function cancelCycleEndNotification(): Promise<void> {
    // Let an arm that has not yet received its id finish first, or there is nothing to cancel
    // yet and the alert outlives the stop that was meant to take it back.
    if (arming) await arming;

    const Notifications = notifications();
    const ids = scheduled;
    scheduled = [];
    if (!Notifications) return;
    await Promise.all(
        ids.map((id) =>
            Notifications.cancelScheduledNotificationAsync(id).catch(() => {
                /* already fired or already gone */
            }),
        ),
    );
}
