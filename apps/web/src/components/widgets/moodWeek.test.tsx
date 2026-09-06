import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { getMoodEntries, setMoodLevel, saveMoodEntry } from "@beyou/api/mood/moodApi";
import type { MoodEntry, MoodLevel } from "@beyou/types/mood/mood";
import { renderWithProviders } from "../../test/test-utils";
import MoodWeek from "./moodWeek";

vi.mock("@beyou/api/mood/moodApi", () => ({
    getMoodEntries: vi.fn(),
    setMoodLevel: vi.fn(),
    saveMoodEntry: vi.fn(),
    deleteMoodEntry: vi.fn(),
}));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const store = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, timezone: "UTC" } } as never,
    });

/** The strip box is shared by the placeholder and the real week — wait for the real one. */
const loadedStrip = async () => {
    const strip = await screen.findByTestId("mood-week-strip");
    await waitFor(() => expect(strip).toHaveAttribute("data-loading", "false"));
    return strip;
};

const entry = (date: string, mood: MoodLevel, note: string | null = null): MoodEntry => ({
    id: `id-${date}`,
    date,
    mood,
    note,
    updatedAt: `${date}T12:00:00Z`,
});

beforeEach(() => {
    vi.setSystemTime(new Date("2026-09-06T15:00:00Z"));
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [] });
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

test("asks for the week ending today, in the user's zone", async () => {
    renderWithProviders(<MoodWeek />, { storeOverride: store() });

    await waitFor(() =>
        expect(getMoodEntries).toHaveBeenCalledWith(
            { from: "2026-08-31", to: "2026-09-06" },
            expect.anything(),
        ),
    );
});

test("offers the five faces when today has no entry", async () => {
    renderWithProviders(<MoodWeek />, { storeOverride: store() });

    expect(await screen.findByTestId("mood-week-faces")).toBeInTheDocument();
    for (const level of [1, 2, 3, 4, 5]) {
        expect(screen.getByTestId(`mood-face-${level}`)).toBeInTheDocument();
    }
});

test("shows the week strip once today is recorded", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 4)] });

    renderWithProviders(<MoodWeek />, { storeOverride: store() });

    expect(await loadedStrip()).toBeInTheDocument();
    expect(screen.queryByTestId("mood-week-faces")).not.toBeInTheDocument();
});

/**
 * While the week is in flight the widget must commit to neither view. It used to paint the strip
 * with seven blank dots and then flip — twice, for anyone who had not marked today.
 */
test("shows a placeholder week rather than an empty one while loading", async () => {
    let resolve: (value: unknown) => void = () => {};
    vi.mocked(getMoodEntries).mockReturnValue(new Promise((r) => { resolve = r; }) as never);

    renderWithProviders(<MoodWeek />, { storeOverride: store() });

    const strip = await screen.findByTestId("mood-week-strip");
    expect(strip).toHaveAttribute("data-loading", "true");
    expect(screen.queryByLabelText(/MoodNotRecorded/)).not.toBeInTheDocument();

    resolve({ success: [] });
    expect(await screen.findByTestId("mood-week-faces")).toBeInTheDocument();
});

/**
 * The rule the whole two-verb split exists for. This widget never loads the journal it might be
 * sitting next to, so it must not be able to write one — and PUT with no note clears it. A test
 * on the call, not on the outcome: the server-side guarantee is proven in MoodServiceIT, and what
 * belongs here is that this component chooses the safe call.
 */
test("records a mood through the level-only call, never the one that replaces the note", async () => {
    vi.mocked(setMoodLevel).mockResolvedValue({ success: entry("2026-09-06", 5, "kept") });
    renderWithProviders(<MoodWeek />, { storeOverride: store() });
    await userEvent.click(await screen.findByTestId("mood-face-5"));

    await waitFor(() => expect(setMoodLevel).toHaveBeenCalledWith("2026-09-06", 5, expect.anything()));
    expect(saveMoodEntry).not.toHaveBeenCalled();
});

test("swaps to the week strip after a face is tapped", async () => {
    vi.mocked(setMoodLevel).mockResolvedValue({ success: entry("2026-09-06", 3) });
    renderWithProviders(<MoodWeek />, { storeOverride: store() });
    await userEvent.click(await screen.findByTestId("mood-face-3"));

    expect(await screen.findByTestId("mood-week-strip")).toBeInTheDocument();
});

test("tapping today's dot brings the faces back so a mood can be corrected", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 2)] });
    renderWithProviders(<MoodWeek />, { storeOverride: store() });
    await userEvent.click(await screen.findByTestId("mood-week-today"));

    expect(await screen.findByTestId("mood-week-faces")).toBeInTheDocument();
});

test("a day with no entry is labelled as not recorded rather than left blank", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 4)] });

    renderWithProviders(<MoodWeek />, { storeOverride: store() });
    await loadedStrip();

    // Six of the seven days were never written; each still announces itself.
    expect(screen.getAllByLabelText(/MoodNotRecorded/)).toHaveLength(6);
});
