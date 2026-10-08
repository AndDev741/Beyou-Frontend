import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import type { BriefingOpenItem, DailyBriefing } from "@beyou/types/briefing/briefing";
import { getBriefingNarrative, getDailyBriefing, markBriefingSeen } from "@beyou/api";
import { checkSnapshotItem } from "@beyou/api/routine/snapshot";
import store from "../../../redux/store";
import { useDailyBriefing } from "./useDailyBriefing";

/**
 * The two behaviours of the hook that the dialog's own tests cannot see.
 *
 * The dashboard reload: each one is six list reads, and calling it after every retroactive
 * check is what drained the read bucket and stacked rate-limit toasts when somebody cleared a
 * long yesterday. It runs once, on close, and only when something changed.
 *
 * The prose poll: the server answers PENDING when the model is slower than its deadline, and
 * before the poll existed nothing ever asked again, so the skeleton stayed up all session.
 */

vi.mock("@beyou/api", () => ({
    getDailyBriefing: vi.fn(),
    getBriefingNarrative: vi.fn(),
    markBriefingSeen: vi.fn(),
}));
vi.mock("@beyou/api/routine/snapshot", () => ({
    checkSnapshotItem: vi.fn(),
    skipSnapshotItem: vi.fn(),
}));
vi.mock("@beyou/state/user/refreshUiThunk", () => ({ applyRefreshUi: vi.fn() }));

const item = (id: string): BriefingOpenItem => ({
    snapshotId: "snap-" + id,
    snapshotCheckId: id,
    date: "2026-09-12",
    routineId: "routine",
    routineName: "Morning",
    itemType: "HABIT",
    itemName: "Item " + id,
    itemIconId: null,
    sectionName: "Warm-up",
    xpIfCheckedNow: 8,
});

const briefing = (over: Partial<DailyBriefing> = {}): DailyBriefing => ({
    date: "2026-09-13",
    yesterday: {
        date: "2026-09-12",
        hadRoutine: true,
        complete: false,
        doneCount: 0,
        skippedCount: 0,
        xpEarned: 0,
        openItems: [item("a"), item("b")],
        focusCycles: 0,
        moodLevel: null,
    },
    today: {
        scheduledItemCount: 3,
        scheduledToday: true,
        currentStreak: 1,
        bestStreak: 2,
        goalsApproaching: [],
        recovery: null,
        goalsAhead: [],
    },
    narrative: { status: "READY", todayLines: ["t"], yesterdayLines: ["y"] },
    seenAt: null,
    ...over,
});

const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

/** Lets the mount fetch resolve and its state land. */
const settle = () => act(async () => {
    await Promise.resolve();
    await Promise.resolve();
});

beforeEach(() => {
    vi.mocked(getDailyBriefing).mockReset();
    vi.mocked(getBriefingNarrative).mockReset();
    vi.mocked(markBriefingSeen).mockReset().mockResolvedValue({ success: true });
    vi.mocked(checkSnapshotItem).mockReset().mockResolvedValue({ success: {} as never });
});

afterEach(() => {
    vi.useRealTimers();
});

test("reloads the dashboard once on close, not after every check", async () => {
    vi.mocked(getDailyBriefing).mockResolvedValue({ success: briefing() });
    const onResolved = vi.fn();
    const { result } = renderHook(() => useDailyBriefing({ tutorialActive: false, onResolved }), { wrapper });
    await settle();
    expect(result.current.open).toBe(true);

    await act(async () => {
        await result.current.resolve(item("a"), "checked");
    });
    await act(async () => {
        await result.current.resolve(item("b"), "checked");
    });

    expect(checkSnapshotItem).toHaveBeenCalledTimes(2);
    expect(onResolved).not.toHaveBeenCalled();

    act(() => result.current.close());

    expect(onResolved).toHaveBeenCalledTimes(1);
});

test("closing without checking anything does not reload", async () => {
    vi.mocked(getDailyBriefing).mockResolvedValue({ success: briefing() });
    const onResolved = vi.fn();
    const { result } = renderHook(() => useDailyBriefing({ tutorialActive: false, onResolved }), { wrapper });
    await settle();

    act(() => result.current.close());

    expect(onResolved).not.toHaveBeenCalled();
});

test("asks for the prose while the dialog is open and swaps it in when it lands", async () => {
    vi.useFakeTimers();
    vi.mocked(getDailyBriefing).mockResolvedValue({
        success: briefing({ narrative: { status: "PENDING", todayLines: [], yesterdayLines: [] } }),
    });
    vi.mocked(getBriefingNarrative)
        .mockResolvedValueOnce({ success: { status: "PENDING", todayLines: [], yesterdayLines: [] } })
        .mockResolvedValueOnce({ success: { status: "READY", todayLines: ["Ahead."], yesterdayLines: ["Behind."] } });
    const { result } = renderHook(() => useDailyBriefing({ tutorialActive: false }), { wrapper });
    await settle();
    expect(result.current.briefing?.narrative.status).toBe("PENDING");

    await act(async () => {
        await vi.advanceTimersByTimeAsync(2000 + 3000);
    });

    expect(getBriefingNarrative).toHaveBeenCalledTimes(2);
    expect(result.current.briefing?.narrative).toEqual({
        status: "READY",
        todayLines: ["Ahead."],
        yesterdayLines: ["Behind."],
    });
});

/** A dialog that will not open has no skeleton to end, so nothing is spent asking. */
test("does not ask for the prose when the dialog is not going to open", async () => {
    vi.useFakeTimers();
    vi.mocked(getDailyBriefing).mockResolvedValue({
        success: briefing({
            seenAt: "2026-09-13T07:00:00Z",
            narrative: { status: "PENDING", todayLines: [], yesterdayLines: [] },
        }),
    });
    const { result } = renderHook(() => useDailyBriefing({ tutorialActive: false }), { wrapper });
    await settle();
    expect(result.current.open).toBe(false);

    await act(async () => {
        await vi.advanceTimersByTimeAsync(80_000);
    });

    expect(getBriefingNarrative).not.toHaveBeenCalled();
});
