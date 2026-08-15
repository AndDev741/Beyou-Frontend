import { render } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";
import { useAutoRefresh } from "./useAutoRefresh";

/**
 * The tab that was right when it loaded and has been wrong ever since.
 *
 * The case that prompted this: tick off the day's routine on the web, sleep, come back
 * to the same tab, and yesterday is still on screen with every box checked. Nothing
 * was broken — the page simply never asked again.
 */
function Probe({ refresh, ...options }: { refresh: () => Promise<unknown>; intervalMs?: number; enabled?: boolean; canRun?: () => boolean }) {
    useAutoRefresh(refresh, options);
    return null;
}

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
};

const fireVisibility = async () => {
    await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
    });
};

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setVisibility("visible");
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it("does not refresh on mount, because the page just loaded", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<Probe refresh={refresh} />);

    expect(refresh).not.toHaveBeenCalled();
});

it("refreshes when the tab comes back into view", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<Probe refresh={refresh} />);

    setVisibility("hidden");
    await fireVisibility();
    expect(refresh).not.toHaveBeenCalled();

    setVisibility("visible");
    await fireVisibility();
    expect(refresh).toHaveBeenCalledWith("foreground");
});

it("refreshes on window focus, for the browsers that never report hidden", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<Probe refresh={refresh} />);

    await act(async () => {
        window.dispatchEvent(new Event("focus"));
    });

    expect(refresh).toHaveBeenCalledWith("foreground");
});

/** The reported bug, in one test. */
it("refreshes when the calendar day turns under an open tab", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(2026, 7, 15, 23, 59, 30));
    render(<Probe refresh={refresh} intervalMs={0} />);

    // A minute later it is tomorrow, and the tab never moved.
    vi.setSystemTime(new Date(2026, 7, 16, 0, 0, 30));
    await act(async () => {
        vi.advanceTimersByTime(60_000);
    });

    expect(refresh).toHaveBeenCalledWith("dayChange");
});

it("asks once when a day turns while the tab was hidden, not twice", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(2026, 7, 15, 23, 0));
    render(<Probe refresh={refresh} intervalMs={0} />);

    setVisibility("hidden");
    await fireVisibility();

    // Away past midnight, then back.
    vi.setSystemTime(new Date(2026, 7, 16, 8, 0));
    setVisibility("visible");
    await fireVisibility();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("dayChange");

    // And the tick that follows does not treat the same flip as news.
    await act(async () => {
        vi.advanceTimersByTime(60_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
});

it("refreshes on its own once the interval has passed", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(2026, 7, 15, 10, 0));
    render(<Probe refresh={refresh} intervalMs={5 * 60_000} />);

    vi.setSystemTime(new Date(2026, 7, 15, 10, 2));
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(refresh).not.toHaveBeenCalled();

    vi.setSystemTime(new Date(2026, 7, 15, 10, 6));
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(refresh).toHaveBeenCalledWith("interval");
});

/** A forgotten tab must cost nothing at all. */
it("never fires while the tab is hidden", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(2026, 7, 15, 10, 0));
    render(<Probe refresh={refresh} intervalMs={60_000} />);

    setVisibility("hidden");
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0));
    await act(async () => { vi.advanceTimersByTime(60_000); });

    expect(refresh).not.toHaveBeenCalled();
});

it("stays out of the way while the caller is busy", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<Probe refresh={refresh} canRun={() => false} />);

    await act(async () => { window.dispatchEvent(new Event("focus")); });

    expect(refresh).not.toHaveBeenCalled();
});

it("does nothing at all when disabled", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(2026, 7, 15, 10, 0));
    render(<Probe refresh={refresh} enabled={false} intervalMs={60_000} />);

    await act(async () => { window.dispatchEvent(new Event("focus")); });
    vi.setSystemTime(new Date(2026, 7, 15, 11, 0));
    await act(async () => { vi.advanceTimersByTime(60_000); });

    expect(refresh).not.toHaveBeenCalled();
});

it("stops listening once the page is gone", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<Probe refresh={refresh} />);

    unmount();
    await act(async () => { window.dispatchEvent(new Event("focus")); });

    expect(refresh).not.toHaveBeenCalled();
});
