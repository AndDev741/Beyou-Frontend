import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getNotebookHome, getStudyCycle, getStudyCycles, getTopicTree } from '@beyou/api/notebook';
import {
  enterNotebookHome, enterNotebookTree, enterStudyCycle, enterStudyCycles, forestOfTrees, subjectSubtree,
} from '@beyou/state';
import type { StudyCycle } from '@beyou/types/notebook/studyCycle';
import type { AppDispatch, RootState } from '../../store';

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
 * The notebook's root topics and the tree of each, for the study cycle's pickers. A subject can be
 * any page, so finding one, its root or its pages means reading every root's tree; a notebook has
 * a handful of roots, so that is a handful of small reads.
 *
 * Each tree is read once per mount even when the slice already holds one: a tree a page screen
 * read an hour ago would miss the pages added since. The held ones show meanwhile. `roots` is
 * null until the home arrives.
 */
export function useNotebookTrees(active = true) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const roots = useNotebookTopics(active);
  const trees = useSelector((s: RootState) => s.notebook.trees);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (!active || !roots) return;
    for (const root of roots) {
      if (requested.current.has(root.id)) continue;
      requested.current.add(root.id);
      void getTopicTree(root.id, t).then((response) => {
        if (response.success) dispatch(enterNotebookTree(response.success));
      });
    }
  }, [active, dispatch, roots, t]);

  return { roots, trees };
}

/** A page in a subject's picker, indented by how deep it sits under the subject. */
export type PageOption = { id: string; title: string; depth: number };

/**
 * A subject and the pages under it, depth first, for a block's or a session's page picker. The
 * server takes only a page inside the subject, so the rest of its topic is not offered, and
 * neither are nodes linked in from another topic (their home is elsewhere). Until the subject
 * turns up in a tree, or when it never does, the subject alone.
 */
export function useSubjectPages(subject: { id: string; title: string } | null): PageOption[] {
  const { trees } = useNotebookTrees(subject !== null);
  const subjectId = subject?.id ?? null;
  const subjectTitle = subject?.title ?? '';

  return useMemo(() => {
    if (!subjectId) return [];
    const found = subjectSubtree(forestOfTrees(trees), subjectId);
    if (found.length === 0) return [{ id: subjectId, title: subjectTitle, depth: 0 }];
    return found.map(({ id, title, depth }) => ({ id, title, depth }));
  }, [trees, subjectId, subjectTitle]);
}
