import type { CycleKind } from "@beyou/state";

/**
 * The beep and the browser notification that tell somebody their cycle ended while the tab was
 * not in front of them. Twin of `apps/mobile/src/focus/notifyCycleEnd.ts`, for a browser.
 *
 * A pomodoro page that only paints digits is silent exactly when it matters: the person switched
 * to their editor, and the tab is in the background with its interval throttled to once a minute.
 * Two channels cover that. The sound is synthesised on the spot with an oscillator, because the
 * web app ships no audio asset and a 300 ms beep is not worth one. The notification is the
 * browser's own, so it shows over whatever window is focused.
 *
 * Everything here fails soft. Both channels sit behind permissions and policies a person is
 * entitled to refuse (autoplay, the notification prompt, a browser without either API), and the
 * timer must keep working without them. A refused permission is a quieter pomodoro, never a
 * broken one, so nothing in this file throws to its caller.
 *
 * `document.hidden` is deliberately NOT a reason to skip anything. A hidden tab is the whole
 * point.
 */

/** Same tag as the Android channel, so a repeat replaces the previous card instead of stacking. */
const NOTIFICATION_TAG = "beyou-focus";

/** How long the card stays up on its own before we take it down. */
const NOTIFICATION_LIFETIME_MS = 8_000;

type AudioContextCtor = new () => AudioContext;

/**
 * One context for the whole app, created inside the user's click.
 *
 * Autoplay policy lets a page make sound only after a gesture, and an `AudioContext` created
 * outside one starts suspended and stays that way. The start button is the gesture, so `prime`
 * runs there and the beep 25 minutes later plays through the context that click unlocked.
 */
let audioContext: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | null {
    if (typeof window === "undefined") return null;
    // Looked up at call time, not import time, so a test can install a stub and jsdom's absence
    // of the API is a null rather than a crash while the module loads.
    const w = window as unknown as {
        AudioContext?: AudioContextCtor;
        webkitAudioContext?: AudioContextCtor;
    };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function ensureAudioContext(): AudioContext | null {
    if (audioContext) return audioContext;
    const Ctor = audioContextCtor();
    if (!Ctor) return null;
    try {
        audioContext = new Ctor();
    } catch {
        audioContext = null;
    }
    return audioContext;
}

function notificationApi(): typeof Notification | null {
    if (typeof window === "undefined") return null;
    if (typeof Notification === "undefined") return null;
    return Notification;
}

export type CycleEndAlertSwitches = {
    soundEnabled: boolean;
    notifyEnabled: boolean;
};

/**
 * Unlock whatever the alerts will need later, from inside the START gesture.
 *
 * Only ever called from a click. The notification prompt in particular must not appear at boot:
 * a permission sheet before the person has pressed anything is the kind that gets refused
 * forever, and a refusal cannot be asked again. Asked only while the answer is still "default";
 * "denied" is respected without a second attempt.
 *
 * Returns a promise so a test can await the permission round trip. Callers in the app ignore it.
 */
export async function primeCycleEndAlerts(switches: CycleEndAlertSwitches): Promise<void> {
    if (switches.soundEnabled) {
        const ctx = ensureAudioContext();
        if (ctx && ctx.state === "suspended") {
            try {
                await ctx.resume();
            } catch {
                /* the browser kept it suspended: the beep will simply not play */
            }
        }
    }

    if (switches.notifyEnabled) {
        const api = notificationApi();
        if (api && api.permission === "default") {
            try {
                await api.requestPermission();
            } catch {
                /* an older browser's callback form, or the prompt closed: nothing to do */
            }
        }
    }
}

/**
 * The two-tone beep. A pomodoro ending rises (time to rest), a break ending falls (back to it),
 * so the ear can tell them apart without reading anything.
 */
const TONES: Record<CycleKind, [number, number]> = {
    pomodoro: [660, 880],
    shortBreak: [880, 660],
    longBreak: [880, 660],
};

const TONE_MS = 160;
const TONE_GAP_MS = 40;

export function playCycleEndSound(kind: CycleKind): void {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
        // A context created outside a gesture stays suspended; resuming here is a no-op when it
        // is already running and a best effort otherwise.
        if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

        const [first, second] = TONES[kind];
        const startAt = ctx.currentTime;
        [first, second].forEach((frequency, index) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const at = startAt + (index * (TONE_MS + TONE_GAP_MS)) / 1000;
            const until = at + TONE_MS / 1000;

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            // A short ramp in and out, or the speaker clicks at each edge.
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(0.25, at + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, until);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(at);
            oscillator.stop(until);
        });
    } catch {
        /* a context the browser refuses to drive: the timer still works, it is just quiet */
    }
}

/**
 * The browser notification. Shown only when permission was granted earlier; never asks here,
 * because a prompt outside a gesture is ignored by browsers anyway.
 */
export function notifyCycleEnd(content: { title: string; body: string }): void {
    const api = notificationApi();
    if (!api || api.permission !== "granted") return;
    try {
        const notification = new api(content.title, {
            body: content.body,
            tag: NOTIFICATION_TAG,
            // The beep is our own channel, with its own switch. Letting the OS chime as well would
            // sound twice, or sound with the sound switch off.
            silent: true,
        });
        // Bring the tab back when the card is clicked. `window.focus` is allowed from this
        // handler because a click on a notification counts as a gesture.
        notification.onclick = () => {
            try {
                window.focus();
            } catch {
                /* some browsers refuse; the card still closes */
            }
            notification.close();
        };
        setTimeout(() => notification.close(), NOTIFICATION_LIFETIME_MS);
    } catch {
        /* a constructor that throws (Android Chrome wants a service worker) is a silent card */
    }
}
