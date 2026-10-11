import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { enterNotebookHome, enterStudyCycle, enterStudyCycles, todayInZone } from "@beyou/state";
import type { StudyCycleSummary } from "@beyou/types/notebook/studyCycle";
import { renderWithProviders } from "../../../../test/test-utils";
import { block, cycle, lap, makeStore, today } from "./fixtures";

// The values matter here (which block, how many minutes), so this file's `t` prints them.
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
        i18n: { language: "en" },
    }),
}));
vi.mock("@beyou/api/notebook", () => ({
    getStudyToday: vi.fn(),
    getStudyCycles: vi.fn(),
    getStudyCycle: vi.fn(),
    getNotebookHome: vi.fn(),
    getTopicTree: vi.fn(),
    logStudySession: vi.fn(),
}));
vi.mock("../../../../lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import { getStudyCycle, getStudyCycles, getStudyToday, getTopicTree, logStudySession } from "@beyou/api/notebook";
import { notify } from "../../../../lib/notify";
import LogSessionDialog from "../LogSessionDialog";

const summary: StudyCycleSummary = { id: "trt", name: "Concurso TRT", position: 0, lap: lap(), today: { minutes: 180, startTime: "19:00" } };
/** Block 9 of Dir. Administrativo holds nothing yet; block 12 is the topic's next. */
const trt = cycle({
    blocks: [
        block("b1", "adm", 1, { progress: { lapNumber: 4, minutes: 75, state: "DONE", closedAt: null, target: null, targetPreview: false, quizPassed: null } }),
        block("b9", "adm", 9),
        block("b12", "adm", 12, { plannedMinutes: 70 }),
    ],
});

function setup() {
    const store = makeStore();
    store.dispatch(enterStudyCycles([summary]));
    store.dispatch(enterStudyCycle(trt));
    store.dispatch(enterNotebookHome({ topics: [], continueStudying: null, review: { due: 0, byTopic: [], streak: 0 } }));
    vi.mocked(getStudyCycles).mockResolvedValue({ success: [summary] });
    vi.mocked(getStudyCycle).mockResolvedValue({ success: trt });
    vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
    vi.mocked(getTopicTree).mockResolvedValue({
        success: {
            topic: { id: "adm", title: "Dir. Administrativo", icon: null }, sourcesCount: 0, cardsDue: 0,
            items: [{ id: "atos", parentId: "adm", title: "Atos administrativos", icon: null, status: "STUDYING", onBoard: true, linked: false, progress: { done: 0, total: 1 }, position: 0 }],
        },
    });
    return store;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("LogSessionDialog", () => {
    test("says which block the minutes land on before sending, and spills like the server", async () => {
        const store = setup();
        renderWithProviders(<LogSessionDialog isOpen onClose={() => {}} defaultTopicId="adm" />, { storeOverride: store });

        const preview = await screen.findByTestId("log-session-preview");
        expect(preview).toHaveTextContent('StudySessionPreviewBlock:{"position":9,"cycle":"Concurso TRT"}');
        expect(preview).toHaveTextContent('StudySessionPreviewMinutes:{"before":0,"after":45,"planned":75}');

        fireEvent.change(screen.getByTestId("log-session-minutes"), { target: { value: "90" } });
        expect(preview).toHaveTextContent('StudySessionPreviewMinutes:{"before":0,"after":75,"planned":75}');
        expect(preview).toHaveTextContent('StudySessionPreviewSpill:{"minutes":15,"position":12}');
    });

    test("logs the session and names the credited block in the toast", async () => {
        const store = setup();
        const onClose = vi.fn();
        vi.mocked(logStudySession).mockResolvedValue({
            success: {
                id: "s1",
                credited: { cycleId: "trt", cycleName: "Concurso TRT", blockId: "b9", position: 9, minutesBefore: 0, minutesAfter: 60, plannedMinutes: 75, state: "OPEN" },
            },
        });
        renderWithProviders(<LogSessionDialog isOpen onClose={onClose} defaultTopicId="adm" />, { storeOverride: store });

        await screen.findByTestId("log-session-preview");
        await screen.findByRole("option", { name: "Atos administrativos" });
        fireEvent.click(screen.getByRole("button", { name: "1h" }));
        fireEvent.change(screen.getByTestId("log-session-page"), { target: { value: "atos" } });
        fireEvent.change(screen.getByTestId("log-session-note"), { target: { value: "  Aula gravada, módulo 4 " } });
        fireEvent.click(screen.getByTestId("log-session-submit"));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(logStudySession).toHaveBeenCalledWith(
            { topicId: "adm", pageId: "atos", minutes: 60, studiedOn: todayInZone(null), note: "Aula gravada, módulo 4" },
            expect.any(Function),
        );
        expect(notify.success).toHaveBeenCalledWith('StudySessionLogged:{"minutes":"1h"}', {
            subtitle: 'StudySessionLoggedInto:{"position":9,"cycle":"Concurso TRT","after":60,"planned":75}',
        });
        // The cycles re-read, so the card and the cycle screen show the block moved.
        await waitFor(() => expect(getStudyToday).toHaveBeenCalled());
    });

    test("keeps the dialog open and says why when the server refuses the date", async () => {
        const store = setup();
        const onClose = vi.fn();
        vi.mocked(logStudySession).mockResolvedValue({ error: { errorKey: "STUDY_SESSION_DATE" } });
        renderWithProviders(<LogSessionDialog isOpen onClose={onClose} defaultTopicId="adm" />, { storeOverride: store });

        await screen.findByTestId("log-session-preview");
        fireEvent.click(screen.getByTestId("log-session-submit"));

        expect(await screen.findByText(/STUDY_SESSION_DATE/)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
