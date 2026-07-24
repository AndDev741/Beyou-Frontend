import { render, screen, act } from "@testing-library/react";
import { describe, test, expect, vi, afterEach } from "vitest";
import { BusyOverlay, BUSY_TIP_KEYS } from "./AiOnboardingWizard";

const t = ((key: string) => key) as never;

describe("BusyOverlay tips", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test("shows a tip and rotates to the next one over time", () => {
        vi.useFakeTimers();
        render(<BusyOverlay label="loading" spin={false} t={t} />);

        const first = screen.getByTestId("busy-tip").textContent ?? "";
        expect(BUSY_TIP_KEYS).toContain(first);

        act(() => {
            vi.advanceTimersByTime(4_000);
        });

        const second = screen.getByTestId("busy-tip").textContent ?? "";
        expect(BUSY_TIP_KEYS).toContain(second);
        expect(second).not.toBe(first);
    });

    test("a remount starts on a different tip than the last shown", () => {
        vi.useFakeTimers();
        const { unmount } = render(<BusyOverlay label="loading" spin={false} t={t} />);
        const first = screen.getByTestId("busy-tip").textContent;
        unmount();

        render(<BusyOverlay label="loading" spin={false} t={t} />);
        expect(screen.getByTestId("busy-tip").textContent).not.toBe(first);
    });
});
