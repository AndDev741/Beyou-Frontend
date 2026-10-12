import { useEffect, useMemo, useRef, useState } from "react";
import type { NotebookTree } from "@beyou/types/notebook/notebook";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { getNotebookHome, getTopicTree } from "@beyou/api/notebook";
import { enterNotebookHome, enterNotebookTree, forestOfTrees, subjectSubtree } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";

export type SubjectPageOption = { id: string; title: string; depth: number };

/**
 * The notebook's root topics and the tree of each, for the study cycle's pickers. A subject can
 * be any page, so finding one, its root or its pages means reading every root's tree; a notebook
 * has a handful of roots, so that is a handful of small reads.
 *
 * Each tree is read once per mount even when the store already holds one: a tree cached by the
 * sidebar an hour ago would miss the pages added since. The cached ones show meanwhile.
 * `loading` holds until the home and every root's tree are in, or their read failed.
 */
export function useNotebookTrees(active = true) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const home = useSelector((state: RootState) => state.notebook.home);
    const trees = useSelector((state: RootState) => state.notebook.trees);
    const [homeFailed, setHomeFailed] = useState(false);
    const [settled, setSettled] = useState<ReadonlySet<string>>(new Set());
    const requested = useRef(new Set<string>());

    useEffect(() => {
        if (!active || home) return;
        void getNotebookHome(t).then((response) => {
            if (response.success) dispatch(enterNotebookHome(response.success));
            else setHomeFailed(true);
        });
    }, [active, home, t, dispatch]);

    const roots = useMemo(() => home?.topics ?? [], [home]);

    useEffect(() => {
        if (!active) return;
        for (const root of roots) {
            if (requested.current.has(root.id)) continue;
            requested.current.add(root.id);
            void getTopicTree(root.id, t).then((response) => {
                if (response.success) dispatch(enterNotebookTree(response.success));
                setSettled((done) => new Set(done).add(root.id));
            });
        }
    }, [active, roots, t, dispatch]);

    const loading = active && ((!home && !homeFailed) || roots.some((root) => !trees[root.id] && !settled.has(root.id)));
    return { roots, trees, loading };
}

/**
 * A subject's pages for a block's or a session's page picker: the subject itself first, then its
 * pages depth first, the way the sidebar nests them. The server takes only a page inside the
 * subject, so the rest of its topic is not offered, and neither are nodes linked in from another
 * topic (their home is elsewhere).
 *
 * Until the subject turns up in a tree (or when it never does) the picker offers the subject
 * alone, which is always a page the server accepts.
 */
export function useSubjectPages(subject: { id: string; title: string } | null) {
    const { trees, loading } = useNotebookTrees(Boolean(subject));
    const subjectId = subject?.id ?? null;
    const subjectTitle = subject?.title ?? "";
    const pages = useMemo(() => subjectPagesOf(trees, subjectId, subjectTitle), [trees, subjectId, subjectTitle]);
    return { pages, loading };
}

/** {@link useSubjectPages} for a screen that already holds the trees from {@link useNotebookTrees}. */
export function subjectPagesOf(
    trees: Record<string, NotebookTree | undefined>,
    subjectId: string | null,
    subjectTitle: string,
): SubjectPageOption[] {
    if (!subjectId) return [];
    const found = subjectSubtree(forestOfTrees(trees), subjectId);
    if (found.length === 0) return [{ id: subjectId, title: subjectTitle, depth: 0 }];
    return found.map(({ id, title, depth }) => ({ id, title, depth }));
}

/** Non-breaking spaces, since a native option collapses ordinary ones and the indent would vanish. */
export const indent = (depth: number): string => "\u00a0\u00a0\u00a0".repeat(Math.max(0, depth));
