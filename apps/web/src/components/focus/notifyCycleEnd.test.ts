import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * jsdom ships neither `AudioContext` nor `Notification`, which is convenient: every test here
 * installs exactly the browser surface it wants and the module is re-imported fresh so its
 * module-level context does not leak between cases.
 */

type NotificationStub = {
    permission: NotificationPermission;
    requestPermission: ReturnType<typeof vi.fn>;
    instances: Array<{ title: string; options: NotificationOptions; close: ReturnType<typeof vi.fn> }>;
};

const installNotification = (permission: NotificationPermission): NotificationStub => {
    const instances: NotificationStub["instances"] = [];
    const requestPermission = vi.fn().mockResolvedValue("granted");
    class FakeNotification {
        static permission = permission;
        static requestPermission = requestPermission;
        onclick: (() => void) | null = null;
        close = vi.fn();
        constructor(title: string, options: NotificationOptions) {
            instances.push({ title, options, close: this.close });
        }
    }
    vi.stubGlobal("Notification", FakeNotification);
    return { permission, requestPermission, instances };
};

const installAudioContext = (state: AudioContextState = "suspended") => {
    const oscillators: Array<{ frequency: { value: number }; start: ReturnType<typeof vi.fn> }> = [];
    const resume = vi.fn().mockResolvedValue(undefined);
    const constructed = vi.fn();
    class FakeAudioContext {
        state = state;
        currentTime = 0;
        destination = {};
        resume = resume;
        constructor() {
            constructed();
        }
        createOscillator() {
            const oscillator = {
                type: "sine",
                frequency: { value: 0 },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            };
            oscillators.push(oscillator);
            return oscillator;
        }
        createGain() {
            return {
                gain: {
                    setValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                },
                connect: vi.fn(),
            };
        }
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    return { oscillators, resume, constructed };
};

const load = async () => await import("./notifyCycleEnd");

beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("primeCycleEndAlerts", () => {
    test("asks for notification permission only while the answer is still default", async () => {
        const stub = installNotification("default");
        installAudioContext();
        const { primeCycleEndAlerts } = await load();

        await primeCycleEndAlerts({ soundEnabled: true, notifyEnabled: true });

        expect(stub.requestPermission).toHaveBeenCalledTimes(1);
    });

    test("never re-asks after a grant or a refusal", async () => {
        for (const permission of ["granted", "denied"] as const) {
            vi.resetModules();
            const stub = installNotification(permission);
            const { primeCycleEndAlerts } = await load();
            await primeCycleEndAlerts({ soundEnabled: false, notifyEnabled: true });
            expect(stub.requestPermission).not.toHaveBeenCalled();
        }
    });

    test("with the notify switch off, the prompt is never shown", async () => {
        const stub = installNotification("default");
        const { primeCycleEndAlerts } = await load();
        await primeCycleEndAlerts({ soundEnabled: true, notifyEnabled: false });
        expect(stub.requestPermission).not.toHaveBeenCalled();
    });

    test("unlocks the audio context from the gesture, once, and resumes a suspended one", async () => {
        const audio = installAudioContext("suspended");
        const { primeCycleEndAlerts } = await load();

        await primeCycleEndAlerts({ soundEnabled: true, notifyEnabled: false });
        await primeCycleEndAlerts({ soundEnabled: true, notifyEnabled: false });

        expect(audio.constructed).toHaveBeenCalledTimes(1);
        expect(audio.resume).toHaveBeenCalled();
    });

    test("survives a browser with neither API", async () => {
        const { primeCycleEndAlerts } = await load();
        await expect(
            primeCycleEndAlerts({ soundEnabled: true, notifyEnabled: true }),
        ).resolves.toBeUndefined();
    });
});

describe("playCycleEndSound", () => {
    test("a pomodoro ending rises and a break ending falls, two tones each", async () => {
        const audio = installAudioContext("running");
        const { playCycleEndSound } = await load();

        playCycleEndSound("pomodoro");
        expect(audio.oscillators.map((o) => o.frequency.value)).toEqual([660, 880]);

        playCycleEndSound("shortBreak");
        expect(audio.oscillators.slice(2).map((o) => o.frequency.value)).toEqual([880, 660]);
        expect(audio.oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
    });

    test("is a no-op without an AudioContext", async () => {
        const { playCycleEndSound } = await load();
        expect(() => playCycleEndSound("pomodoro")).not.toThrow();
    });
});

describe("notifyCycleEnd", () => {
    test("shows a card that replaces the previous one and takes itself down", async () => {
        const stub = installNotification("granted");
        const { notifyCycleEnd } = await load();

        notifyCycleEnd({ title: "Pomodoro", body: "Pomodoro over. Time for a break." });

        expect(stub.instances).toHaveLength(1);
        expect(stub.instances[0].title).toBe("Pomodoro");
        expect(stub.instances[0].options).toMatchObject({
            body: "Pomodoro over. Time for a break.",
            tag: "beyou-focus",
        });
        expect(stub.instances[0].close).not.toHaveBeenCalled();
        vi.advanceTimersByTime(10_000);
        expect(stub.instances[0].close).toHaveBeenCalled();
    });

    test("shows nothing without permission, and never asks from here", async () => {
        const stub = installNotification("default");
        const { notifyCycleEnd } = await load();

        notifyCycleEnd({ title: "Pomodoro", body: "x" });

        expect(stub.instances).toHaveLength(0);
        expect(stub.requestPermission).not.toHaveBeenCalled();
    });

    test("is a no-op in a browser without Notification", async () => {
        const { notifyCycleEnd } = await load();
        expect(() => notifyCycleEnd({ title: "a", body: "b" })).not.toThrow();
    });
});
