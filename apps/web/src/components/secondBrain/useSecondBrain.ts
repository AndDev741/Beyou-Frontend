import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage, type ApiErrorPayload } from "@beyou/api/apiError";
import {
    answerSecondBrainQuestion,
    createSecondBrainFact,
    deleteSecondBrainFact,
    deleteSecondBrainNote,
    deleteSecondBrainOldNote,
    discardSecondBrainOldNoteLine,
    editSecondBrainFact,
    editSecondBrainNote,
    getSecondBrain,
    keepSecondBrainOldNoteLine,
    refillSecondBrainQuestions,
    refreshSecondBrainInsight,
    setSecondBrainSource,
    skipSecondBrainQuestion,
} from "@beyou/api/secondBrain/secondBrainApi";
import {
    secondBrainAnswerLeftNotes,
    secondBrainMemoryWithNote,
    secondBrainMemoryWithoutNote,
    secondBrainRefillIsDue,
} from "@beyou/state";
import {
    type SecondBrainAnswerResult,
    type SecondBrainFactInput,
    type SecondBrainOverview,
    type SecondBrainSource,
} from "@beyou/types/secondBrain/secondBrain";
import type { OldNoteKeepOutcome } from "./OldNoteBlock";

export type SecondBrainStatus = "loading" | "ready" | "error";

/**
 * Error keys that mean the page is out of date: the note or the line is already gone, deleted
 * on another device or by the assistant. The page is read again so it shows what is there.
 */
const STALE_KEYS = new Set(["SECOND_BRAIN_NOTE_NOT_FOUND", "SECOND_BRAIN_OLD_NOTE_LINE_NOT_FOUND"]);

/** A server older than the memory sends neither field; the page treats that as none. */
const withMemory = (page: SecondBrainOverview): SecondBrainOverview => ({
    ...page,
    memory: page.memory ?? [],
    oldNote: page.oldNote ?? [],
});

/**
 * When the page last asked the server for more questions. Kept for the browser session so
 * that walking in and out of the page does not turn into a request each time: the route sits
 * in the costly rate tier because it may end in a model call.
 */
const REFILL_STAMP_KEY = "beyou-second-brain-refill";

/** When this browser session last asked, or null if it never did or storage is closed to us. */
function lastRefillAt(): number | null {
    try {
        return Number(sessionStorage.getItem(REFILL_STAMP_KEY)) || null;
    } catch {
        return null;
    }
}

function stampRefill() {
    try {
        sessionStorage.setItem(REFILL_STAMP_KEY, String(Date.now()));
    } catch {
        /* storage unavailable: the page asks again on the next visit, which is harmless */
    }
}

/**
 * Everything the Second Brain page reads and writes.
 *
 * Page-local state and not a Redux slice: nothing outside this page shows any of it yet. When
 * a second screen needs it (the phone, a dashboard widget) this moves to `@beyou/state`.
 */
export function useSecondBrain() {
    const { t } = useTranslation();
    const [overview, setOverview] = useState<SecondBrainOverview | null>(null);
    const [status, setStatus] = useState<SecondBrainStatus>("loading");
    const [loadError, setLoadError] = useState<ApiErrorPayload | null>(null);
    const [writing, setWriting] = useState(false);
    const [insightError, setInsightError] = useState<ApiErrorPayload | null>(null);
    const [refilling, setRefilling] = useState(false);
    const [pendingSource, setPendingSource] = useState<SecondBrainSource | null>(null);

    // At most one automatic refill and one automatic overview per visit. Refs and not state: React's
    // development double mount would otherwise fire each of them twice.
    const autoRefilled = useRef(false);
    const autoWrote = useRef(false);

    const fail = useCallback(
        (error: ApiErrorPayload) => {
            toast.error(getFriendlyErrorMessage(t, error));
        },
        [t],
    );

    const refill = useCallback(async () => {
        setRefilling(true);
        const response = await refillSecondBrainQuestions(t);
        setRefilling(false);
        stampRefill();
        if (response.error) {
            fail(response.error);
            return;
        }
        const questions = response.success ?? [];
        setOverview((prev) => (prev ? { ...prev, questions } : prev));
    }, [fail, t]);

    const writeInsight = useCallback(async () => {
        setWriting(true);
        setInsightError(null);
        const response = await refreshSecondBrainInsight(t);
        setWriting(false);
        if (response.error || !response.success) {
            setInsightError(response.error ?? { message: t("UnexpectedError") });
            return;
        }
        const insight = response.success;
        setOverview((prev) => (prev ? { ...prev, insight } : prev));
    }, [t]);

    /** `quiet` reloads behind what is on screen, for changes that move other blocks. */
    const load = useCallback(
        async (quiet = false) => {
            if (!quiet) setStatus("loading");
            const response = await getSecondBrain(t);
            if (response.error || !response.success) {
                if (quiet) {
                    if (response.error) fail(response.error);
                    return;
                }
                setLoadError(response.error ?? { message: t("UnexpectedError") });
                setStatus("error");
                return;
            }
            const next = withMemory(response.success);
            setOverview(next);
            setLoadError(null);
            setStatus("ready");

            // aiAvailable is false without a yes to the AI provider: no refill behind the person's back.
            if (!autoRefilled.current && next.aiAvailable && secondBrainRefillIsDue(next.questions.length, lastRefillAt(), Date.now())) {
                autoRefilled.current = true;
                void refill();
            }
            // A stale overview is rewritten on the first visit of the day: the page exists to
            // say where the person stands, and yesterday's verdict does not. The server decides
            // what stale means (written before the account's current day), so a second visit
            // the same day finds it fresh and costs nothing.
            //
            // Only an overview that exists. The first one is asked for with a button that sits
            // beside the AI notice, so nothing of a person's goes to the provider because they
            // opened a page out of curiosity.
            if (!autoWrote.current && next.aiAvailable && next.insight.text && next.insight.stale) {
                autoWrote.current = true;
                void writeInsight();
            }
        },
        [fail, refill, t, writeInsight],
    );

    useEffect(() => {
        void load();
    }, [load]);

    const answer = useCallback(
        async (id: string, text: string): Promise<SecondBrainAnswerResult | null> => {
            const response = await answerSecondBrainQuestion(id, text, t);
            if (response.error || !response.success) {
                if (response.error) fail(response.error);
                return null;
            }
            const result = response.success;
            setOverview((prev) =>
                prev
                    ? {
                          ...prev,
                          questions: prev.questions.filter((question) => question.id !== id),
                          facts: [...prev.facts, ...result.learned],
                      }
                    : prev,
            );
            // Which category and which thing a note lands under is the server's call, so the
            // page is read again rather than guessing where to put it.
            if (secondBrainAnswerLeftNotes(result)) void load(true);
            return result;
        },
        [fail, load, t],
    );

    const skip = useCallback(
        async (id: string): Promise<boolean> => {
            const response = await skipSecondBrainQuestion(id, t);
            if (response.error) {
                fail(response.error);
                return false;
            }
            setOverview((prev) =>
                prev ? { ...prev, questions: prev.questions.filter((question) => question.id !== id) } : prev,
            );
            return true;
        },
        [fail, t],
    );

    const createFact = useCallback(
        async (input: SecondBrainFactInput): Promise<boolean> => {
            const response = await createSecondBrainFact(input, t);
            if (response.error || !response.success) {
                if (response.error) fail(response.error);
                return false;
            }
            const fact = response.success;
            setOverview((prev) => (prev ? { ...prev, facts: [...prev.facts, fact] } : prev));
            return true;
        },
        [fail, t],
    );

    const editFact = useCallback(
        async (id: string, input: SecondBrainFactInput): Promise<boolean> => {
            const response = await editSecondBrainFact(id, input, t);
            if (response.error || !response.success) {
                if (response.error) fail(response.error);
                return false;
            }
            const fact = response.success;
            setOverview((prev) =>
                prev ? { ...prev, facts: prev.facts.map((item) => (item.id === id ? fact : item)) } : prev,
            );
            return true;
        },
        [fail, t],
    );

    const deleteFact = useCallback(
        async (id: string): Promise<boolean> => {
            const response = await deleteSecondBrainFact(id, t);
            if (response.error) {
                fail(response.error);
                return false;
            }
            setOverview((prev) => (prev ? { ...prev, facts: prev.facts.filter((item) => item.id !== id) } : prev));
            return true;
        },
        [fail, t],
    );

    /** Toasts a failed write, and reads the page again when it failed because the page was stale. */
    const failWrite = useCallback(
        (error: ApiErrorPayload) => {
            fail(error);
            if (error.errorKey && STALE_KEYS.has(error.errorKey)) void load(true);
        },
        [fail, load],
    );

    const editNote = useCallback(
        async (id: string, text: string): Promise<boolean> => {
            const response = await editSecondBrainNote(id, text, t);
            if (response.error || !response.success) {
                if (response.error) failWrite(response.error);
                return false;
            }
            // The server's note, origin included: an edit keeps where the note came from.
            const note = response.success;
            setOverview((prev) => (prev ? { ...prev, memory: secondBrainMemoryWithNote(prev.memory, note) } : prev));
            return true;
        },
        [failWrite, t],
    );

    const deleteNote = useCallback(
        async (id: string): Promise<boolean> => {
            const response = await deleteSecondBrainNote(id, t);
            if (response.error) {
                failWrite(response.error);
                return false;
            }
            setOverview((prev) => (prev ? { ...prev, memory: secondBrainMemoryWithoutNote(prev.memory, id) } : prev));
            return true;
        },
        [failWrite, t],
    );

    const keepOldLine = useCallback(
        async (line: string): Promise<OldNoteKeepOutcome> => {
            const response = await keepSecondBrainOldNoteLine(line, t);
            if (response.error || !response.success) {
                // A full profile is said in the block, next to the button, instead of a toast.
                if (response.error?.errorKey === "SECOND_BRAIN_FACT_LIMIT_REACHED") return "full";
                if (response.error) failWrite(response.error);
                return "error";
            }
            const { lines, fact } = response.success;
            setOverview((prev) =>
                prev ? { ...prev, oldNote: lines, facts: fact ? [...prev.facts, fact] : prev.facts } : prev,
            );
            return "ok";
        },
        [failWrite, t],
    );

    const discardOldLine = useCallback(
        async (line: string): Promise<boolean> => {
            const response = await discardSecondBrainOldNoteLine(line, t);
            if (response.error || !response.success) {
                if (response.error) failWrite(response.error);
                return false;
            }
            const { lines } = response.success;
            setOverview((prev) => (prev ? { ...prev, oldNote: lines } : prev));
            return true;
        },
        [failWrite, t],
    );

    const clearOldNote = useCallback(async (): Promise<boolean> => {
        const response = await deleteSecondBrainOldNote(t);
        if (response.error) {
            fail(response.error);
            return false;
        }
        setOverview((prev) => (prev ? { ...prev, oldNote: [] } : prev));
        return true;
    }, [fail, t]);

    const toggleSource = useCallback(
        async (source: SecondBrainSource, enabled: boolean) => {
            setPendingSource(source);
            const response = await setSecondBrainSource(source, enabled, t);
            setPendingSource(null);
            if (response.error || !response.success) {
                if (response.error) fail(response.error);
                return;
            }
            const sources = response.success;
            setOverview((prev) => (prev ? { ...prev, sources } : prev));
            // A source feeds other blocks (routines feed two of them), so they are read again.
            void load(true);
        },
        [fail, load, t],
    );

    return {
        overview,
        status,
        loadError,
        reload: load,
        writing,
        insightError,
        writeInsight,
        refilling,
        refill,
        answer,
        skip,
        createFact,
        editFact,
        deleteFact,
        editNote,
        deleteNote,
        keepOldLine,
        discardOldLine,
        clearOldNote,
        pendingSource,
        toggleSource,
    };
}
