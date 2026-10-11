import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getNotebookHome, getStudyCycle, getStudyCycles, getTopicTree } from '@beyou/api/notebook';
import { enterNotebookHome, enterNotebookTree, enterStudyCycle, enterStudyCycles } from '@beyou/state';
import type { StudyCycle } from '@beyou/types/notebook/studyCycle';
import type { AppDispatch, RootState } from '../../store';
import { topicPages, type PageOption } from './cycleText';

/**
 * Every active cycle, in full, in the list's order. The session sheet needs them to say which
 * block a session goes to, the editor to know which topics another cycle already holds.
 *
 * `load` reads the list and then each cycle the slice does not hold yet; a cycle already open
 * stays as it is (the screens that write to one re-read it themselves).
 */
export function useCyclesInFull() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const list = useSelector((s: RootState) => s.studyCycles.list);
  const byId = useSelector((s: RootState) => s.studyCycles.byId);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await getStudyCycles(t);
    if (response.success) dispatch(enterStudyCycles(response.success));
    const state = store.getState().studyCycles;
    const missing = state.list.filter((cycle) => !state.byId[cycle.id]);
    const cycles = await Promise.all(missing.map((cycle) => getStudyCycle(cycle.id, t)));
    cycles.forEach((cycle) => {
      if (cycle.success) dispatch(enterStudyCycle(cycle.success));
    });
    setLoading(false);
  }, [dispatch, store, t]);

  const cycles = useMemo(
    () => list.map((summary) => byId[summary.id]).filter((cycle): cycle is StudyCycle => !!cycle),
    [byId, list],
  );

  return { cycles, loading, load };
}

/** The notebook's topics, read once if the home has not been opened yet. */
export function useNotebookTopics(active = true) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const home = useSelector((s: RootState) => s.notebook.home);

  useEffect(() => {
    if (!active || home) return;
    let cancelled = false;
    void getNotebookHome(t).then((response) => {
      if (!cancelled && response.success) dispatch(enterNotebookHome(response.success));
    });
    return () => {
      cancelled = true;
    };
  }, [active, dispatch, home, t]);

  return home?.topics ?? null;
}

/**
 * A topic and the pages under it, for a block's or a session's page picker. The tree comes from
 * the notebook slice when the topic's page screen already read it, from the server otherwise.
 */
export function useTopicPages(topic: { id: string; title: string } | null): PageOption[] {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const tree = useSelector((s: RootState) => (topic ? s.notebook.trees[topic.id] : undefined));
  const topicId = topic?.id ?? null;

  useEffect(() => {
    if (!topicId || tree) return;
    let cancelled = false;
    void getTopicTree(topicId, t).then((response) => {
      if (!cancelled && response.success) dispatch(enterNotebookTree(response.success));
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, topicId, tree, t]);

  return useMemo(() => (topic ? topicPages(topic, tree) : []), [topic, tree]);
}
