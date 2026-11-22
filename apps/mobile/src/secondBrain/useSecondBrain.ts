import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '@beyou/api';
import { getFriendlyErrorMessage, type ApiErrorPayload } from '@beyou/api/apiError';
import {
  secondBrainAnswerLeftNotes,
  secondBrainMemoryWithNote,
  secondBrainMemoryWithoutNote,
  secondBrainRefillIsDue,
} from '@beyou/state';
import type { RefreshReason } from '@beyou/state/sync/autoRefresh';
import type {
  SecondBrainAnswerResult,
  SecondBrainFactInput,
  SecondBrainOverview,
  SecondBrainSource,
} from '@beyou/types/secondBrain/secondBrain';
import { notify } from '../notify';
import type { OldNoteKeepOutcome } from './OldNoteBlock';

export type SecondBrainStatus = 'loading' | 'ready' | 'error';

/**
 * Error keys that mean the screen is out of date: the note or the line is already gone,
 * deleted on another device or by the assistant. The page is read again so it shows what
 * is there.
 */
const STALE_KEYS = new Set(['SECOND_BRAIN_NOTE_NOT_FOUND', 'SECOND_BRAIN_OLD_NOTE_LINE_NOT_FOUND']);

/** A server older than the memory sends neither field; the screen treats that as none. */
const withMemory = (page: SecondBrainOverview): SecondBrainOverview => ({
  ...page,
  memory: page.memory ?? [],
  oldNote: page.oldNote ?? [],
});

/**
 * When this app last asked the server for more questions. The web keeps it in
 * sessionStorage; the phone has none, so it lives in the module. It outlasts the screen,
 * which is the point: walking in and out of the page must not turn into a request each
 * time, since the route sits in the costly rate tier and may end in a model call.
 */
let lastRefillAt: number | null = null;

/**
 * `full` is the first read and the retry: it owns the loading and error states.
 * `quiet` reads behind what is on screen after the person changed something, and says so
 * when it fails. `silent` is a refresh nobody asked for, so its failure is not shown.
 */
type ReadMode = 'full' | 'quiet' | 'silent';

/**
 * Everything the Second Brain screen reads and writes. The phone twin of
 * `apps/web/src/components/secondBrain/useSecondBrain.ts`, with the same rules: one read
 * for the page, at most one automatic question refill and one automatic rewrite of an
 * existing overview per visit (the first overview is only ever asked for), and a source
 * change reads the page again because a source feeds other blocks.
 *
 * Screen-local state and not a Redux slice, like the web: nothing else on the phone shows it.
 */
export function useSecondBrain() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<SecondBrainOverview | null>(null);
  const [status, setStatus] = useState<SecondBrainStatus>('loading');
  const [loadError, setLoadError] = useState<ApiErrorPayload | null>(null);
  const [writing, setWriting] = useState(false);
  const [insightError, setInsightError] = useState<ApiErrorPayload | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [pendingSource, setPendingSource] = useState<SecondBrainSource | null>(null);

  // At most one automatic refill and one automatic overview per visit. Refs and not state,
  // so an effect that runs twice cannot fire either of them twice.
  const autoRefilled = useRef(false);
  const autoWrote = useRef(false);
  // Either request can take a model call's time, and coming back to the screen meanwhile
  // must not start a second one.
  const refillInFlight = useRef(false);
  const writeInFlight = useRef(false);
  // Counts the writes applied to the page, so a read can tell it was overtaken by one.
  const writes = useRef(0);
  // A request still in flight when the screen goes must not start another after it.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fail = useCallback(
    (error: ApiErrorPayload) => {
      notify.error(getFriendlyErrorMessage(t, error));
    },
    [t],
  );

  /** Puts a write's result on the page and marks any read still in flight as out of date. */
  const apply = useCallback((change: (page: SecondBrainOverview) => SecondBrainOverview) => {
    writes.current += 1;
    setOverview((prev) => (prev ? change(prev) : prev));
  }, []);

  const refill = useCallback(async () => {
    if (refillInFlight.current) return;
    refillInFlight.current = true;
    setRefilling(true);
    const response = await refillSecondBrainQuestions(t);
    refillInFlight.current = false;
    setRefilling(false);
    lastRefillAt = Date.now();
    if (response.error) {
      fail(response.error);
      return;
    }
    const questions = response.success ?? [];
    apply((page) => ({ ...page, questions }));
  }, [apply, fail, t]);

  const writeInsight = useCallback(async () => {
    if (writeInFlight.current) return;
    writeInFlight.current = true;
    setWriting(true);
    setInsightError(null);
    const response = await refreshSecondBrainInsight(t);
    writeInFlight.current = false;
    setWriting(false);
    if (response.error || !response.success) {
      setInsightError(response.error ?? { message: t('UnexpectedError') });
      return;
    }
    const insight = response.success;
    apply((page) => ({ ...page, insight }));
  }, [apply, t]);

  const read = useCallback(
    async (mode: ReadMode) => {
      if (mode === 'full') setStatus('loading');
      let seen = writes.current;
      let response = await getSecondBrain(t);
      // A write that landed while the read was in flight is newer than the read's answer,
      // which would put back what the write changed. Read again instead.
      while (alive.current && response.success && writes.current !== seen) {
        seen = writes.current;
        response = await getSecondBrain(t);
      }
      if (!alive.current) return;
      if (response.error || !response.success) {
        if (mode === 'full') {
          setLoadError(response.error ?? { message: t('UnexpectedError') });
          setStatus('error');
        } else if (mode === 'quiet' && response.error) {
          fail(response.error);
        }
        return;
      }
      const next = withMemory(response.success);
      setOverview(next);
      setLoadError(null);
      setStatus('ready');

      if (!autoRefilled.current && secondBrainRefillIsDue(next.questions.length, lastRefillAt, Date.now())) {
        autoRefilled.current = true;
        void refill();
      }
      // A stale overview is rewritten on the first visit of the day: the page exists to say
      // where the person stands, and yesterday's verdict does not. The server decides what
      // stale means, so a second visit the same day finds it fresh and costs nothing.
      //
      // Only an overview that exists. The first one is asked for with a button that sits
      // beside the AI notice, so nothing of a person's goes to the provider because they
      // opened a screen out of curiosity.
      if (!autoWrote.current && next.aiAvailable && next.insight.text && next.insight.stale) {
        autoWrote.current = true;
        void writeInsight();
      }
    },
    [fail, refill, t, writeInsight],
  );

  /** The first read, and the retry after it failed. */
  const reload = useCallback(() => read('full'), [read]);

  /**
   * The screen came back into view, or has been open a while (see `useAutoRefresh`).
   *
   * Coming back counts as a visit. The web opens the page again on every navigation; the
   * phone keeps the screen mounted under whatever was pushed on top, and overnight in the
   * background, so without this the first visit of a day would never get its overview.
   * The timer does not count: nobody arrived.
   */
  const refresh = useCallback(
    async (reason: RefreshReason) => {
      if (reason !== 'interval') {
        autoRefilled.current = false;
        autoWrote.current = false;
      }
      await read('silent');
    },
    [read],
  );

  useEffect(() => {
    void read('full');
  }, [read]);

  const answer = useCallback(
    async (id: string, text: string): Promise<SecondBrainAnswerResult | null> => {
      const response = await answerSecondBrainQuestion(id, text, t);
      if (response.error || !response.success) {
        if (response.error) fail(response.error);
        return null;
      }
      const result = response.success;
      apply((page) => ({
        ...page,
        questions: page.questions.filter((question) => question.id !== id),
        facts: [...page.facts, ...result.learned],
      }));
      // Which category and which thing a note lands under is the server's call, so the
      // page is read again rather than guessing where to put it.
      if (secondBrainAnswerLeftNotes(result)) void read('quiet');
      return result;
    },
    [apply, fail, read, t],
  );

  const skip = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await skipSecondBrainQuestion(id, t);
      if (response.error) {
        fail(response.error);
        return false;
      }
      apply((page) => ({ ...page, questions: page.questions.filter((question) => question.id !== id) }));
      return true;
    },
    [apply, fail, t],
  );

  const createFact = useCallback(
    async (input: SecondBrainFactInput): Promise<boolean> => {
      const response = await createSecondBrainFact(input, t);
      if (response.error || !response.success) {
        if (response.error) fail(response.error);
        return false;
      }
      const fact = response.success;
      apply((page) => ({ ...page, facts: [...page.facts, fact] }));
      return true;
    },
    [apply, fail, t],
  );

  const editFact = useCallback(
    async (id: string, input: SecondBrainFactInput): Promise<boolean> => {
      const response = await editSecondBrainFact(id, input, t);
      if (response.error || !response.success) {
        if (response.error) fail(response.error);
        return false;
      }
      const fact = response.success;
      apply((page) => ({ ...page, facts: page.facts.map((item) => (item.id === id ? fact : item)) }));
      return true;
    },
    [apply, fail, t],
  );

  const deleteFact = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await deleteSecondBrainFact(id, t);
      if (response.error) {
        fail(response.error);
        return false;
      }
      apply((page) => ({ ...page, facts: page.facts.filter((item) => item.id !== id) }));
      return true;
    },
    [apply, fail, t],
  );

  /** Says why a write failed, and reads the page again when it failed because the page was stale. */
  const failWrite = useCallback(
    (error: ApiErrorPayload) => {
      fail(error);
      if (error.errorKey && STALE_KEYS.has(error.errorKey)) void read('quiet');
    },
    [fail, read],
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
      apply((page) => ({ ...page, memory: secondBrainMemoryWithNote(page.memory, note) }));
      return true;
    },
    [apply, failWrite, t],
  );

  const deleteNote = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await deleteSecondBrainNote(id, t);
      if (response.error) {
        failWrite(response.error);
        return false;
      }
      apply((page) => ({ ...page, memory: secondBrainMemoryWithoutNote(page.memory, id) }));
      return true;
    },
    [apply, failWrite, t],
  );

  const keepOldLine = useCallback(
    async (line: string): Promise<OldNoteKeepOutcome> => {
      const response = await keepSecondBrainOldNoteLine(line, t);
      if (response.error || !response.success) {
        // A full profile is said in the block, under the button, instead of a toast.
        if (response.error?.errorKey === 'SECOND_BRAIN_FACT_LIMIT_REACHED') return 'full';
        if (response.error) failWrite(response.error);
        return 'error';
      }
      const { lines, fact } = response.success;
      apply((page) => ({ ...page, oldNote: lines, facts: fact ? [...page.facts, fact] : page.facts }));
      return 'ok';
    },
    [apply, failWrite, t],
  );

  const discardOldLine = useCallback(
    async (line: string): Promise<boolean> => {
      const response = await discardSecondBrainOldNoteLine(line, t);
      if (response.error || !response.success) {
        if (response.error) failWrite(response.error);
        return false;
      }
      const { lines } = response.success;
      apply((page) => ({ ...page, oldNote: lines }));
      return true;
    },
    [apply, failWrite, t],
  );

  const clearOldNote = useCallback(async (): Promise<boolean> => {
    const response = await deleteSecondBrainOldNote(t);
    if (response.error) {
      fail(response.error);
      return false;
    }
    apply((page) => ({ ...page, oldNote: [] }));
    return true;
  }, [apply, fail, t]);

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
      apply((page) => ({ ...page, sources }));
      // A source feeds other blocks (routines feed two of them), so they are read again.
      void read('quiet');
    },
    [apply, fail, read, t],
  );

  return {
    overview,
    status,
    loadError,
    reload,
    refresh,
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
