import { StrictMode } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import {
    answerSecondBrainQuestion,
    createSecondBrainFact,
    deleteSecondBrainFact,
    editSecondBrainFact,
    getSecondBrain,
    refillSecondBrainQuestions,
    refreshSecondBrainInsight,
    setSecondBrainSource,
    skipSecondBrainQuestion,
} from "@beyou/api/secondBrain/secondBrainApi";
import type {
    SecondBrainFact,
    SecondBrainOverview,
    SecondBrainQuestion,
} from "@beyou/types/secondBrain/secondBrain";
import { openAgentPanelWithDraft } from "../../components/agent/agentPanelBus";
import { renderWithProviders } from "../../test/test-utils";
import SecondBrain from "./SecondBrain";

vi.mock("@beyou/api/secondBrain/secondBrainApi", () => ({
    getSecondBrain: vi.fn(),
    setSecondBrainSource: vi.fn(),
    createSecondBrainFact: vi.fn(),
    editSecondBrainFact: vi.fn(),
    deleteSecondBrainFact: vi.fn(),
    refillSecondBrainQuestions: vi.fn(),
    answerSecondBrainQuestion: vi.fn(),
    skipSecondBrainQuestion: vi.fn(),
    refreshSecondBrainInsight: vi.fn(),
}));

vi.mock("../../components/useAuthGuard", () => ({ default: () => {} }));

vi.mock("../../components/agent/agentPanelBus", () => ({
    openAgentPanelWithDraft: vi.fn(),
}));

const question = (id: string, kind: SecondBrainQuestion["kind"], text: string): SecondBrainQuestion => ({
    id,
    kind,
    text,
    status: "OPEN",
    answer: null,
    createdAt: "2026-11-13T09:00:00Z",
    answeredAt: null,
});

const fact = (id: string, kind: SecondBrainFact["kind"], text: string, origin: SecondBrainFact["origin"] = "USER"): SecondBrainFact => ({
    id,
    kind,
    text,
    origin,
    createdAt: "2026-11-13T09:00:00Z",
    updatedAt: "2026-11-13T09:00:00Z",
});

const overview = (patch: Partial<SecondBrainOverview> = {}): SecondBrainOverview => ({
    insight: { text: "You kept most of the week.", verdict: "ON_COURSE", generatedAt: "2026-11-13T08:00:00Z", stale: false },
    goalsAhead: [
        {
            id: "goal-1",
            name: "Visa interview",
            iconId: "lucide:plane",
            currentValue: 3,
            targetValue: 10,
            unit: "sessions",
            endDate: "2026-12-01",
            daysRemaining: 18,
            percentComplete: 30,
            remainingValue: 7,
            requiredPerDay: 0.4,
            expectedPercent: 55,
            pace: "BEHIND",
        },
    ],
    routine: {
        thisWeekPercent: 72,
        previousWeekPercent: 64,
        slipping: [{ name: "Read", asked: 5, checked: 1 }],
        steady: [{ name: "Gym", asked: 3, checked: 3 }],
    },
    areas: [
        { categoryId: "c1", name: "Health", iconId: null, asked: 12, checked: 10, percent: 83 },
        { categoryId: "c2", name: "Study", iconId: null, asked: 10, checked: 3, percent: 30 },
    ],
    questions: [question("q1", "PROFILE_OBJECTIVES", "What do you want out of this year?")],
    facts: [fact("f1", "LIKE", "Cooking on Sundays")],
    sources: [
        { source: "ROUTINES", enabled: true },
        { source: "GOALS", enabled: true },
        { source: "MOOD", enabled: true },
        { source: "CALENDAR", enabled: false },
        { source: "NOTEBOOK", enabled: false },
        { source: "IDEAS", enabled: false },
    ],
    aiAvailable: true,
    ...patch,
});

/**
 * StrictMode on purpose. The page fires two requests by itself on a first visit (the question
 * refill and the first overview), and development React runs every effect twice. Rendered
 * plainly, a version that asked the model twice would pass.
 */
const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

/** A store of its own per render, so the onboarding flag of one case cannot leak into the next. */
const store = (isTutorialCompleted: boolean) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, isTutorialCompleted } } as never,
    });

const renderPage = ({ onboarded = true }: { onboarded?: boolean } = {}) =>
    renderWithProviders(
        <StrictMode>
            <SecondBrain />
        </StrictMode>,
        { route: "/second-brain", storeOverride: store(onboarded) },
    );

const mockLoad = (value: SecondBrainOverview) => {
    vi.mocked(getSecondBrain).mockResolvedValue({ success: value });
    vi.mocked(refillSecondBrainQuestions).mockResolvedValue({ success: value.questions });
};

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
});

describe("SecondBrain", () => {
    it("draws every block from one read", async () => {
        mockLoad(overview());
        renderPage();

        expect(await screen.findByText("You kept most of the week.")).toBeInTheDocument();
        expect(screen.getByText("Visa interview")).toBeInTheDocument();
        // The fixture goal needs 0.4 a day, so the sentence is the weekly one.
        expect(screen.getByText("BriefingGoalPaceBehindWeek")).toBeInTheDocument();
        expect(screen.getByText("72%")).toBeInTheDocument();
        expect(within(screen.getByTestId("second-brain-slipping")).getByText("Read")).toBeInTheDocument();
        expect(within(screen.getByTestId("second-brain-steady")).getByText("Gym")).toBeInTheDocument();
        expect(screen.getByText("What do you want out of this year?")).toBeInTheDocument();
        expect(screen.getByText("Cooking on Sundays")).toBeInTheDocument();
        expect(screen.getAllByRole("switch")).toHaveLength(6);
    });

    it("names only the two ends of the ranking", async () => {
        mockLoad(overview());
        renderPage();

        const areas = await screen.findAllByTestId("second-brain-area");
        expect(within(areas[0]).getByText("SecondBrainAreaStrongest")).toBeInTheDocument();
        expect(within(areas[1]).getByText("SecondBrainAreaWeakest")).toBeInTheDocument();
    });

    it("asks for more questions once per visit, not once per effect run", async () => {
        mockLoad(overview());
        renderPage();

        await screen.findByText("What do you want out of this year?");
        await waitFor(() => expect(refillSecondBrainQuestions).toHaveBeenCalledTimes(1));
    });

    it("leaves a full question list alone", async () => {
        const five = ["a", "b", "c", "d", "e"].map((id) => question(id, "FOLLOW_UP", `Question ${id}`));
        mockLoad(overview({ questions: five }));
        renderPage();

        await screen.findByText("Question a");
        expect(refillSecondBrainQuestions).not.toHaveBeenCalled();
    });

    /**
     * Opening the page sends nothing to the AI provider. The first overview is something the
     * person asks for, from a button that sits beside the notice saying where the text goes.
     */
    it("waits to be asked for the first overview, and says where it will be written", async () => {
        mockLoad(overview({ insight: { text: null, verdict: null, generatedAt: null, stale: true } }));
        vi.mocked(refreshSecondBrainInsight).mockResolvedValue({
            success: { text: "A first read.", verdict: "TOO_EARLY", generatedAt: "2026-11-13T09:00:00Z", stale: false },
        });
        renderPage();

        expect(await screen.findByTestId("second-brain-privacy-notice")).toHaveTextContent("SecondBrainPrivacyNotice");
        expect(refreshSecondBrainInsight).not.toHaveBeenCalled();

        userEvent.click(screen.getByTestId("second-brain-overview-write"));
        expect(await screen.findByText("A first read.")).toBeInTheDocument();
        expect(refreshSecondBrainInsight).toHaveBeenCalledTimes(1);
        // Once it is in use the notice has done its job and is not repeated over every overview.
        expect(screen.queryByTestId("second-brain-privacy-notice")).not.toBeInTheDocument();
    });

    /**
     * The page exists to say where the person stands today. An overview the server calls stale
     * (written before the account's current day) is rewritten on the visit, with nobody
     * pressing anything.
     */
    it("rewrites yesterday's overview on the first visit of the day", async () => {
        mockLoad(
            overview({
                insight: { text: "Old read.", verdict: "ON_COURSE", generatedAt: "2026-11-01T09:00:00Z", stale: true },
            }),
        );
        vi.mocked(refreshSecondBrainInsight).mockResolvedValue({
            success: { text: "You are drifting.", verdict: "DRIFTING", generatedAt: "2026-11-13T09:00:00Z", stale: false },
        });
        renderPage();

        expect(await screen.findByText("You are drifting.")).toBeInTheDocument();
        expect(refreshSecondBrainInsight).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("second-brain-verdict")).toHaveTextContent("SecondBrainVerdictDrifting");
        expect(screen.queryByText("Old read.")).not.toBeInTheDocument();
    });

    it("leaves today's overview alone, so a second visit costs no model call", async () => {
        mockLoad(overview());
        renderPage();

        expect(await screen.findByText("You kept most of the week.")).toBeInTheDocument();
        expect(screen.getByTestId("second-brain-verdict")).toHaveTextContent("SecondBrainVerdictOnCourse");
        expect(refreshSecondBrainInsight).not.toHaveBeenCalled();
    });

    it("draws no label for a verdict it does not know", async () => {
        mockLoad(
            overview({
                insight: {
                    text: "Something new.",
                    verdict: "AHEAD" as never,
                    generatedAt: "2026-11-13T08:00:00Z",
                    stale: false,
                },
            }),
        );
        renderPage();

        expect(await screen.findByText("Something new.")).toBeInTheDocument();
        expect(screen.queryByTestId("second-brain-verdict")).not.toBeInTheDocument();
    });

    it("says the AI is off instead of offering a button that cannot work", async () => {
        mockLoad(overview({ aiAvailable: false, insight: { text: null, verdict: null, generatedAt: null, stale: true } }));
        renderPage();

        expect(await screen.findByText("SecondBrainAiOff")).toBeInTheDocument();
        expect(screen.queryByTestId("second-brain-overview-write")).not.toBeInTheDocument();
        expect(refreshSecondBrainInsight).not.toHaveBeenCalled();
    });

    it("turns a profile answer into a line of the profile", async () => {
        mockLoad(overview());
        const learned = fact("f2", "OBJECTIVE", "Pass the visa interview", "ANSWER");
        vi.mocked(answerSecondBrainQuestion).mockResolvedValue({
            success: {
                question: { ...overview().questions[0], status: "ANSWERED", answer: "Pass the visa interview" },
                learned: [learned],
            },
        });
        renderPage();

        userEvent.type(await screen.findByTestId("second-brain-answer-input"), "  Pass the visa interview  ");
        userEvent.click(screen.getByTestId("second-brain-answer-send"));

        const result = await screen.findByTestId("second-brain-answer-result");
        expect(answerSecondBrainQuestion).toHaveBeenCalledWith("q1", "Pass the visa interview", expect.anything());
        expect(within(result).getByText("SecondBrainLearnedTitle")).toBeInTheDocument();
        // A profile answer is the fact itself, so there is nothing for the assistant to act on.
        expect(screen.queryByTestId("second-brain-act")).not.toBeInTheDocument();
        expect(
            within(screen.getByTestId("second-brain-facts-OBJECTIVE")).getByText("Pass the visa interview"),
        ).toBeInTheDocument();
    });

    it("offers a check-in answer to the assistant as a draft", async () => {
        const checkIn = question("q9", "CHECK_IN", "How is your day going?");
        mockLoad(overview({ questions: [checkIn] }));
        vi.mocked(answerSecondBrainQuestion).mockResolvedValue({
            success: { question: { ...checkIn, status: "ANSWERED", answer: "Skipped the gym" }, learned: [] },
        });
        renderPage();

        userEvent.type(await screen.findByTestId("second-brain-answer-input"), "Skipped the gym");
        userEvent.click(screen.getByTestId("second-brain-answer-send"));

        userEvent.click(await screen.findByTestId("second-brain-act"));
        expect(openAgentPanelWithDraft).toHaveBeenCalledTimes(1);
        expect(screen.getByText("SecondBrainLearnedNothing")).toBeInTheDocument();
    });

    /**
     * The assistant is hidden until onboarding finishes. A draft handed to it then would sit
     * parked and surface in its input on some later day, about a question long forgotten.
     */
    it("does not offer the hand-off while the assistant is still hidden by onboarding", async () => {
        const checkIn = question("q9", "CHECK_IN", "How is your day going?");
        mockLoad(overview({ questions: [checkIn] }));
        vi.mocked(answerSecondBrainQuestion).mockResolvedValue({
            success: { question: { ...checkIn, status: "ANSWERED", answer: "Skipped the gym" }, learned: [] },
        });
        renderPage({ onboarded: false });

        userEvent.type(await screen.findByTestId("second-brain-answer-input"), "Skipped the gym");
        userEvent.click(screen.getByTestId("second-brain-answer-send"));

        expect(await screen.findByTestId("second-brain-answer-result")).toBeInTheDocument();
        expect(screen.queryByTestId("second-brain-act")).not.toBeInTheDocument();
    });

    it("drops a skipped question from the list", async () => {
        const two = [question("q1", "FOLLOW_UP", "First?"), question("q2", "FOLLOW_UP", "Second?")];
        mockLoad(overview({ questions: two }));
        vi.mocked(skipSecondBrainQuestion).mockResolvedValue({ success: { ...two[0], status: "SKIPPED" } });
        renderPage();

        await screen.findByText("First?");
        userEvent.click(screen.getByTestId("second-brain-question-skip"));

        expect(await screen.findByText("Second?")).toBeInTheDocument();
        expect(skipSecondBrainQuestion).toHaveBeenCalledWith("q1", expect.anything());
        await waitFor(() => expect(screen.queryByText("First?")).not.toBeInTheDocument());
    });

    it("reads the page again after a source changes, since a source feeds other blocks", async () => {
        mockLoad(overview());
        vi.mocked(setSecondBrainSource).mockResolvedValue({
            success: overview().sources.map((item) =>
                item.source === "CALENDAR" ? { ...item, enabled: true } : item,
            ),
        });
        renderPage();

        const calendar = await screen.findByTestId("second-brain-source-CALENDAR");
        // Counted from the click: StrictMode reads the page twice on mount, so "twice" would
        // be true before anything was toggled.
        const readsBefore = vi.mocked(getSecondBrain).mock.calls.length;
        userEvent.click(calendar);

        await waitFor(() => expect(setSecondBrainSource).toHaveBeenCalledWith("CALENDAR", true, expect.anything()));
        await waitFor(() => expect(vi.mocked(getSecondBrain).mock.calls.length).toBe(readsBefore + 1));
        await waitFor(() =>
            expect(screen.getByTestId("second-brain-source-CALENDAR")).toHaveAttribute("aria-checked", "true"),
        );
    });

    it("says a block is switched off rather than showing it empty", async () => {
        mockLoad(
            overview({
                routine: null,
                areas: [],
                sources: overview().sources.map((item) =>
                    item.source === "ROUTINES" ? { ...item, enabled: false } : item,
                ),
            }),
        );
        renderPage();

        const routine = await screen.findByTestId("second-brain-routine");
        expect(within(routine).getByText("SecondBrainSourceOffBlock")).toBeInTheDocument();
        expect(within(screen.getByTestId("second-brain-areas")).getByText("SecondBrainSourceOffBlock")).toBeInTheDocument();
    });

    it("adds, edits and removes a profile line", async () => {
        mockLoad(overview());
        vi.mocked(createSecondBrainFact).mockResolvedValue({ success: fact("f3", "ABOUT", "Two kids") });
        vi.mocked(editSecondBrainFact).mockResolvedValue({ success: fact("f3", "ABOUT", "Two kids and a dog") });
        vi.mocked(deleteSecondBrainFact).mockResolvedValue({ success: true });
        renderPage();

        // Every step waits for what the last one drew: user-event v13 does not flush a click's
        // state update before returning.
        userEvent.click(await screen.findByTestId("second-brain-fact-add-ABOUT"));
        userEvent.type(await screen.findByTestId("second-brain-fact-input"), "Two kids");
        userEvent.click(screen.getByRole("button", { name: "Save" }));
        // Wait for the saved row, not for the text: the text is also what sits in the input.
        const about = screen.getByTestId("second-brain-facts-ABOUT");
        const saved = await within(about).findByTestId("second-brain-fact");
        expect(within(saved).getByText("Two kids")).toBeInTheDocument();
        expect(createSecondBrainFact).toHaveBeenCalledWith({ kind: "ABOUT", text: "Two kids" }, expect.anything());

        userEvent.click(within(saved).getByRole("button", { name: "Edit" }));
        const input = await screen.findByTestId("second-brain-fact-input");
        userEvent.clear(input);
        userEvent.type(input, "Two kids and a dog");
        userEvent.click(screen.getByRole("button", { name: "Save" }));
        const edited = await within(about).findByTestId("second-brain-fact");
        expect(within(edited).getByText("Two kids and a dog")).toBeInTheDocument();

        userEvent.click(within(edited).getByRole("button", { name: "Delete" }));
        await waitFor(() => expect(screen.queryByText("Two kids and a dog")).not.toBeInTheDocument());
        expect(deleteSecondBrainFact).toHaveBeenCalledWith("f3", expect.anything());
    });

    it("offers a way back when the page cannot load", async () => {
        // Not `Once`: StrictMode runs the load twice, and both runs have to fail.
        vi.mocked(getSecondBrain).mockResolvedValue({ error: { message: "boom" } });
        renderPage();

        expect(await screen.findByTestId("second-brain-error")).toBeInTheDocument();

        mockLoad(overview());
        userEvent.click(screen.getByRole("button", { name: "TryAgain" }));
        expect(await screen.findByText("You kept most of the week.")).toBeInTheDocument();
    });
});
