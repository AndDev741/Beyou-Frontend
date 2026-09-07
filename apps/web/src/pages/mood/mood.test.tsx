import { StrictMode } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import {
    deleteMoodEntry,
    getMoodEntries,
    saveMoodEntry,
    setMoodLevel,
} from "@beyou/api/mood/moodApi";
import type { MoodEntry, MoodLevel } from "@beyou/types/mood/mood";
import { renderWithProviders } from "../../test/test-utils";
import Mood from "./mood";

vi.mock("@beyou/api/mood/moodApi", () => ({
    getMoodEntries: vi.fn(),
    setMoodLevel: vi.fn(),
    saveMoodEntry: vi.fn(),
    deleteMoodEntry: vi.fn(),
}));

vi.mock("../../components/useAuthGuard", () => ({ default: () => {} }));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const store = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, timezone: "UTC" } } as never,
    });

const entry = (date: string, mood: MoodLevel, note: string | null = null): MoodEntry => ({
    id: `id-${date}`,
    date,
    mood,
    note,
    updatedAt: `${date}T12:00:00Z`,
});

/**
 * StrictMode on purpose, and it is the point of this file.
 *
 * The bug these tests exist for only appears when React invokes a `setState` updater more than
 * once for the same state, which is exactly what StrictMode does in development. Rendered
 * plainly, the buggy version passed.
 */
const renderPage = (route = "/mood") =>
    renderWithProviders(
        <StrictMode>
            <Mood />
        </StrictMode>,
        { storeOverride: store(), route },
    );

beforeEach(() => {
    vi.setSystemTime(new Date("2026-09-06T15:00:00Z"));
    localStorage.clear();
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [] });
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

/**
 * The regression the user found: write a journal on one day, move to another, and the first
 * day's text was still in the box. Saving there would have copied it onto the wrong day — or
 * cleared the original once the box was emptied by hand.
 */
test("moving to another day clears the journal box", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-06", 4, "Today I finally finished it.")],
    });

    renderPage();

    const box = await screen.findByTestId("mood-note");
    await waitFor(() => expect(box).toHaveValue("Today I finally finished it."));

    await userEvent.click(screen.getByTestId("mood-previous-day"));

    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue(""));
});

test("coming back to a day brings its journal back", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-06", 4, "Kept.")],
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue("Kept."));

    await userEvent.click(screen.getByTestId("mood-previous-day"));
    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue(""));

    await userEvent.click(screen.getByTestId("mood-next-day"));
    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue("Kept."));
});

/** Typing into a day whose entry has not landed yet must survive the entry landing empty. */
test("text already typed is not wiped by an entry that arrives carrying no note", async () => {
    let resolve: (value: unknown) => void = () => {};
    vi.mocked(getMoodEntries).mockReturnValue(
        new Promise((r) => {
            resolve = r;
        }) as never,
    );

    renderPage();
    const box = await screen.findByTestId("mood-note");
    await userEvent.type(box, "half a sentence");

    resolve({ success: [entry("2026-09-06", 3, null)] });

    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue("half a sentence"));
});

test("the journal collapses and the choice is remembered", async () => {
    renderPage();

    const toggle = await screen.findByTestId("mood-journal-toggle");
    expect(screen.getByTestId("mood-note")).toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.getByTestId("mood-note")).not.toBeVisible());
    expect(localStorage.getItem("beyou-mood-journal-open")).toBe("false");
});

test("a collapsed journal starts collapsed on the next visit", async () => {
    localStorage.setItem("beyou-mood-journal-open", "false");

    renderPage();

    const toggle = await screen.findByTestId("mood-journal-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("the month calendar labels a recorded day with how it felt", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-02", 1), entry("2026-09-06", 5)],
    });

    renderPage();

    const grid = await screen.findByTestId("mood-month");
    await waitFor(() =>
        expect(within(grid).getByTestId("mood-day-2026-09-02")).toHaveAccessibleName(
            /MoodLevel1/,
        ),
    );
    expect(within(grid).getByTestId("mood-day-2026-09-06")).toHaveAccessibleName(/MoodLevel5/);
    // A day nobody recorded still says so rather than being silent.
    expect(within(grid).getByTestId("mood-day-2026-09-03")).toHaveAccessibleName(
        /MoodNotRecorded/,
    );
});

test("a future day cannot be picked in the calendar", async () => {
    renderPage();

    const grid = await screen.findByTestId("mood-month");
    expect(within(grid).getByTestId("mood-day-2026-09-07")).toBeDisabled();
    expect(screen.getByTestId("mood-next-day")).toBeDisabled();
});

test("the entry filter narrows the list by how the day felt", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [
            entry("2026-09-06", 5, "great day"),
            entry("2026-09-05", 1, "awful day"),
            entry("2026-09-04", 5, "another great one"),
        ],
    });

    renderPage();

    const list = await screen.findByTestId("mood-recent");
    await waitFor(() => expect(within(list).getAllByRole("listitem")).toHaveLength(3));

    // The chip carries the count, so hiding "great" should leave exactly the one awful day.
    await userEvent.click(screen.getByTestId("mood-filter-5"));

    await waitFor(() =>
        expect(within(screen.getByTestId("mood-recent")).getAllByRole("listitem")).toHaveLength(1),
    );
    expect(screen.getByText("awful day")).toBeInTheDocument();
});

test("hiding every level says so instead of showing an empty list", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 5, "only one")] });

    renderPage();
    await screen.findByTestId("mood-recent");

    await userEvent.click(screen.getByTestId("mood-filter-5"));

    expect(await screen.findByText("MoodRecentAllHidden")).toBeInTheDocument();
});

test("the list says where it ends", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: Array.from({ length: 20 }, (_, index) =>
            entry(`2026-08-${String(index + 1).padStart(2, "0")}`, 3, `day ${index}`),
        ),
    });

    renderPage("/mood?date=2026-08-20");

    const list = await screen.findByTestId("mood-recent");
    await waitFor(() => expect(within(list).getAllByRole("listitem")).toHaveLength(14));
    expect(screen.getByTestId("mood-show-more")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("mood-show-more"));

    await waitFor(() =>
        expect(within(screen.getByTestId("mood-recent")).getAllByRole("listitem")).toHaveLength(20),
    );
    expect(screen.queryByTestId("mood-show-more")).not.toBeInTheDocument();
});

/** A tap on a face must never send the request that could replace the note. */
test("picking a face sends the level-only call", async () => {
    vi.mocked(setMoodLevel).mockResolvedValue({ success: entry("2026-09-06", 2) });

    renderPage();
    await userEvent.click(await screen.findByTestId("mood-scale-2"));

    await waitFor(() =>
        expect(setMoodLevel).toHaveBeenCalledWith("2026-09-06", 2, expect.anything()),
    );
    expect(saveMoodEntry).not.toHaveBeenCalled();
});

/**
 * The scale is a set of toggles and `aria-pressed` says so, so un-pressing has to mean something.
 * Without this a day could be changed but never taken back, and the only way out was the trash
 * icon buried in the entry list.
 */
test("tapping the chosen face leaves the day unrecorded", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 3)] });
    vi.mocked(deleteMoodEntry).mockResolvedValue({ success: undefined });

    renderPage();

    const chosen = await screen.findByTestId("mood-scale-3");
    await waitFor(() => expect(chosen).toHaveAttribute("aria-pressed", "true"));

    await userEvent.click(chosen);

    await waitFor(() =>
        expect(deleteMoodEntry).toHaveBeenCalledWith("2026-09-06", expect.anything()),
    );
    await waitFor(() =>
        expect(screen.getByTestId("mood-scale-3")).toHaveAttribute("aria-pressed", "false"),
    );
});

/**
 * The one guard on it. Removing the entry removes the note with it, and the note is the only
 * thing here nobody can get back — so a day with writing asks before it goes.
 */
test("un-recording a day that carries writing asks first", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-06", 3, "something I would rather keep")],
    });
    vi.mocked(deleteMoodEntry).mockResolvedValue({ success: undefined });

    renderPage();
    const chosen = await screen.findByTestId("mood-scale-3");
    await waitFor(() => expect(chosen).toHaveAttribute("aria-pressed", "true"));

    await userEvent.click(chosen);

    expect(await screen.findByTestId("mood-confirm-delete")).toBeInTheDocument();
    expect(deleteMoodEntry).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("mood-confirm-delete"));

    await waitFor(() =>
        expect(deleteMoodEntry).toHaveBeenCalledWith("2026-09-06", expect.anything()),
    );
});

test("cancelling that confirmation keeps the day and its writing", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-06", 3, "kept after all")],
    });

    renderPage();
    // Waiting on the TEXT, not on aria-pressed: the attribute flips on the render where the entry
    // arrives, one commit before the effect seeds the box, so a click there is a plain "pick
    // level 3" rather than the un-press this test is about.
    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue("kept after all"));

    await userEvent.click(screen.getByTestId("mood-scale-3"));
    await screen.findByTestId("mood-confirm-delete");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByTestId("mood-confirm-delete")).not.toBeInTheDocument());
    expect(deleteMoodEntry).not.toHaveBeenCalled();
    expect(screen.getByTestId("mood-note")).toHaveValue("kept after all");
});

/**
 * The seeding effect protects typed text from an entry that arrives empty. An explicit removal
 * is not that case, and leaving the deleted note in the box would offer it straight back to Save.
 */
test("un-recording clears the journal box", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [entry("2026-09-06", 3, "about to go")],
    });
    vi.mocked(deleteMoodEntry).mockResolvedValue({ success: undefined });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue("about to go"));
    await waitFor(() =>
        expect(screen.getByTestId("mood-scale-3")).toHaveAttribute("aria-pressed", "true"),
    );

    await userEvent.click(screen.getByTestId("mood-scale-3"));
    await userEvent.click(await screen.findByTestId("mood-confirm-delete"));

    await waitFor(() => expect(screen.getByTestId("mood-note")).toHaveValue(""));
});

test("tapping a different face changes the day rather than removing it", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({ success: [entry("2026-09-06", 3)] });
    vi.mocked(setMoodLevel).mockResolvedValue({ success: entry("2026-09-06", 5) });

    renderPage();
    await waitFor(() =>
        expect(screen.getByTestId("mood-scale-3")).toHaveAttribute("aria-pressed", "true"),
    );

    await userEvent.click(screen.getByTestId("mood-scale-5"));

    await waitFor(() =>
        expect(setMoodLevel).toHaveBeenCalledWith("2026-09-06", 5, expect.anything()),
    );
    expect(deleteMoodEntry).not.toHaveBeenCalled();
});
