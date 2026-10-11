import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { addDaysIso, mondayOf, todayInZone } from "@beyou/state";
import type { StudyHistory } from "@beyou/types/notebook/studyCycle";
import { renderWithProviders } from "../../../test/test-utils";
import { cycle, makeStore, today, topic } from "../../../components/notebook/cycles/__tests__/fixtures";

vi.mock("@beyou/api/notebook", () => ({
    getStudyCycle: vi.fn(),
    getStudyCycles: vi.fn(),
    getStudyToday: vi.fn(),
    getStudyHistory: vi.fn(),
    deleteStudySession: vi.fn(),
}));

import { deleteStudySession, getStudyCycle, getStudyCycles, getStudyHistory, getStudyToday } from "@beyou/api/notebook";
import StudyCycleHistory from "../StudyCycleHistory";

const monday = mondayOf(todayInZone(null));
const constitucional = topic("const", "Dir. Constitucional");
const portugues = topic("port", "Português");

/** This week: a Monday with two pomodoros, a logged class, a concept understood and a lap closed. */
const history = (): StudyHistory => ({
    cycleId: "trt", from: monday, to: addDaysIso(monday, 6), topics: [constitucional, portugues],
    days: [
        {
            date: monday, plannedMinutes: 180, minutes: 145,
            byTopic: [{ topicId: "const", minutes: 75 }, { topicId: "port", minutes: 70 }],
            entries: [
                { kind: "FOCUS", at: `${monday}T09:02:00Z`, topic: constitucional, page: { id: "df", title: "Direitos fundamentais", icon: null }, minutes: 50 },
                { kind: "FOCUS", at: `${monday}T09:57:00Z`, topic: constitucional, page: { id: "df", title: "Direitos fundamentais", icon: null }, minutes: 25 },
                { kind: "UNDERSTOOD", at: `${monday}T10:22:00Z`, topic: constitucional, page: { id: "df", title: "Direitos fundamentais", icon: null }, minutes: 75 },
                { kind: "MANUAL", at: `${monday}T10:30:00Z`, sessionId: "s1", topic: portugues, page: null, minutes: 70, note: "Aula gravada, módulo 3" },
                { kind: "LAP_CLOSED", at: `${monday}T14:00:00Z`, lapNumber: 3 },
            ],
        },
        ...[1, 2, 3, 4, 5, 6].map((i) => ({ date: addDaysIso(monday, i), plannedMinutes: i === 6 ? 0 : 180, minutes: 0, byTopic: [], entries: [] })),
    ],
});

function renderHistory() {
    return renderWithProviders(
        <Routes>
            <Route path="/notebook/cycles/:cycleId/history" element={<StudyCycleHistory />} />
        </Routes>,
        { route: "/notebook/cycles/trt/history", storeOverride: makeStore() },
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudyCycle).mockResolvedValue({ success: cycle() });
    vi.mocked(getStudyCycles).mockResolvedValue({ success: [] });
    vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
    vi.mocked(getStudyHistory).mockResolvedValue({ success: history() });
});

describe("StudyCycleHistory", () => {
    test("reads the week and lists a day in the order it happened", async () => {
        renderHistory();

        await waitFor(() => expect(getStudyHistory).toHaveBeenCalledWith("trt", monday, addDaysIso(monday, 6), expect.any(Function)));
        expect(await screen.findAllByTestId("history-day")).toHaveLength(7);
        fireEvent.click(screen.getAllByTestId("history-day")[0]);

        const day = screen.getByTestId("history-day-entries");
        const sessions = within(day).getAllByTestId("history-session");
        expect(sessions.map((row) => row.dataset.kind)).toEqual(["FOCUS", "FOCUS", "MANUAL"]);
        expect(within(day).getByTestId("history-understood")).toHaveTextContent("StudyHistoryUnderstood");
        expect(within(day).getByTestId("history-lap-closed")).toBeInTheDocument();
        // Only a logged session can be deleted; a pomodoro belongs to the focus history.
        expect(within(day).getAllByTestId("session-delete")).toHaveLength(1);
        expect(screen.getByTestId("history-legend")).toHaveTextContent("Dir. Constitucional");
    });

    test("deletes a logged session after asking, then reads the week again", async () => {
        vi.mocked(deleteStudySession).mockResolvedValue({ success: undefined });
        renderHistory();

        fireEvent.click((await screen.findAllByTestId("history-day"))[0]);
        fireEvent.click(await screen.findByTestId("session-delete"));
        fireEvent.click(await screen.findByTestId("session-delete-confirm"));

        await waitFor(() => expect(deleteStudySession).toHaveBeenCalledWith("s1", expect.any(Function)));
        await waitFor(() => expect(getStudyHistory).toHaveBeenCalledTimes(2));
        // The block that held the minutes may have reopened: the cycles re-read too.
        await waitFor(() => expect(getStudyToday).toHaveBeenCalled());
    });

    test("walks back a week and will not walk into the future", async () => {
        renderHistory();

        await screen.findAllByTestId("history-day");
        expect(screen.getByTestId("history-next")).toBeDisabled();
        fireEvent.click(screen.getByTestId("history-prev"));

        await waitFor(() =>
            expect(getStudyHistory).toHaveBeenLastCalledWith("trt", addDaysIso(monday, -7), addDaysIso(monday, -1), expect.any(Function))
        );
        expect(screen.getByTestId("history-next")).not.toBeDisabled();
    });
});
