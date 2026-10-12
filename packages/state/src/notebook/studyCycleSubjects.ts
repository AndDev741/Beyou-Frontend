import type { NotebookTree, PageRef, TreeItem } from '@beyou/types/notebook/notebook';

/**
 * Which notebook pages a study cycle may take as subjects, shared by the web and the phone so
 * both editors offer the same list and refuse the same picks.
 *
 * A subject is any page the person owns: a root topic or a page anywhere under one. Two subjects
 * never overlap (contract 10.2): across every active cycle, no subject is the same page as,
 * an ancestor of, or a descendant of another one, so a pomodoro on a page credits exactly one
 * block. The server enforces it (STUDY_CYCLE_TOPIC_TAKEN, STUDY_CYCLE_TOPIC_OVERLAP); this says it
 * in the picker before the round trip.
 *
 * The family tree is the HOME chain (`parentId`). A tree also lists nodes linked in from another
 * topic (`linked`); those are skipped here, because their home, and so their place in the
 * ancestry, is in the other topic's tree.
 */

/** A page in the notebook's home forest, depth first in the sidebar's order. */
export type SubjectNode = {
    id: string;
    title: string;
    icon: string | null;
    /** The root topic the page lives under; its own id for a root. */
    rootId: string;
    /** The root topic's title; null for a root, the way the server's refs say it. */
    rootTitle: string | null;
    /** 0 for a root topic, 1 for its direct pages, and so on. */
    depth: number;
    parentId: string | null;
};

/**
 * Why a page cannot be added: already in this cycle, overlapping a subject of this cycle (it sits
 * inside one or holds one), or overlapping a subject another active cycle holds.
 */
export type SubjectDisabledReason = null | 'picked' | 'overlapsPicked' | { takenBy: string };

export type SubjectOption = Omit<SubjectNode, 'parentId'> & { disabledReason: SubjectDisabledReason };

type Trees = Record<string, NotebookTree | undefined>;

/**
 * The notebook as one depth-first list: each root in `roots` order, followed by its home pages
 * in the order the sidebar nests them (by `position` under each parent). A root whose tree has
 * not arrived yet is listed alone, so the picker can still offer it.
 */
export function subjectForest(roots: PageRef[], trees: Trees): SubjectNode[] {
    const out: SubjectNode[] = [];
    const seen = new Set<string>();
    for (const root of roots) {
        if (seen.has(root.id)) continue;
        seen.add(root.id);
        const tree = trees[root.id];
        const title = tree?.topic.title ?? root.title;
        out.push({ id: root.id, title, icon: tree?.topic.icon ?? root.icon, rootId: root.id, rootTitle: null, depth: 0, parentId: null });
        if (!tree) continue;
        const children = new Map<string, TreeItem[]>();
        for (const item of tree.items) {
            if (item.linked) continue;
            const siblings = children.get(item.parentId) ?? [];
            siblings.push(item);
            children.set(item.parentId, siblings);
        }
        const walk = (parentId: string, depth: number) => {
            for (const item of [...(children.get(parentId) ?? [])].sort((a, b) => a.position - b.position)) {
                if (seen.has(item.id)) continue;
                seen.add(item.id);
                out.push({ id: item.id, title: item.title, icon: item.icon, rootId: root.id, rootTitle: title, depth, parentId });
                walk(item.id, depth + 1);
            }
        };
        walk(root.id, 1);
    }
    return out;
}

/** The pages above `id`, nearest first, as far as the loaded trees know. */
function ancestorsOf(id: string, parents: Map<string, string | null>): string[] {
    const chain: string[] = [];
    const guard = new Set<string>([id]);
    let parent = parents.get(id) ?? null;
    while (parent !== null && !guard.has(parent)) {
        chain.push(parent);
        guard.add(parent);
        parent = parents.get(parent) ?? null;
    }
    return chain;
}

/**
 * The editor's picker: every root and its pages (see {@link subjectForest}), each with the reason
 * it cannot be added, or null when it can.
 *
 * @param picked the subjects already in the cycle being edited
 * @param taken  subject id → name of the other active cycle that holds it
 *
 * A page counts as overlapping a subject when it is that subject, lies inside it, or contains it.
 * This cycle's own subjects come first in the reasons: a page both inside a picked subject and
 * next to another cycle's is reported as overlapping the pick, the one the person can undo here.
 * A subject whose page is in no loaded tree can only match itself.
 */
export function subjectOptions({ roots, trees, picked, taken = {} }: {
    roots: PageRef[];
    trees: Trees;
    picked: string[];
    taken?: Record<string, string>;
}): SubjectOption[] {
    const forest = subjectForest(roots, trees);
    const parents = new Map(forest.map((node) => [node.id, node.parentId]));
    const pickedSet = new Set(picked);
    // Pages that hold a picked subject somewhere below them.
    const abovePicked = new Set(picked.flatMap((id) => ancestorsOf(id, parents)));
    // Pages that hold another cycle's subject below them, with that cycle's name.
    const aboveTaken = new Map<string, string>();
    for (const [id, cycle] of Object.entries(taken)) {
        for (const ancestor of ancestorsOf(id, parents)) if (!aboveTaken.has(ancestor)) aboveTaken.set(ancestor, cycle);
    }

    return forest.map((node) => {
        const above = ancestorsOf(node.id, parents);
        let reason: SubjectDisabledReason = null;
        if (pickedSet.has(node.id)) reason = 'picked';
        else if (abovePicked.has(node.id) || above.some((id) => pickedSet.has(id))) reason = 'overlapsPicked';
        else {
            const holder = taken[node.id] ?? above.map((id) => taken[id]).find(Boolean) ?? aboveTaken.get(node.id);
            if (holder) reason = { takenBy: holder };
        }
        return {
            id: node.id, title: node.title, icon: node.icon, rootId: node.rootId, rootTitle: node.rootTitle, depth: node.depth,
            disabledReason: reason,
        };
    });
}

/**
 * A subject and every page under it, depth first, the subject first at depth 0. For the page
 * pickers of a block or a session: the server only takes a page inside the block's subject.
 * Empty when the subject is in none of the given trees.
 */
export function subjectSubtree(forest: SubjectNode[], subjectId: string): SubjectNode[] {
    const start = forest.findIndex((node) => node.id === subjectId);
    if (start < 0) return [];
    const base = forest[start].depth;
    const out: SubjectNode[] = [{ ...forest[start], depth: 0 }];
    for (let i = start + 1; i < forest.length && forest[i].depth > base; i++) {
        out.push({ ...forest[i], depth: forest[i].depth - base });
    }
    return out;
}

/**
 * {@link subjectForest} built from whatever trees are loaded, in no particular root order. For the
 * page pickers, which only need to find one subject, not to list the notebook.
 */
export const forestOfTrees = (trees: Trees): SubjectNode[] =>
    subjectForest(
        Object.values(trees).filter((tree): tree is NotebookTree => Boolean(tree)).map((tree) => tree.topic),
        trees,
    );

/** "Software Engineer › Implementação 2.0" for a page inside a topic, the plain title for a root. */
export const subjectLabel = (ref: { title: string; rootTitle?: string | null }): string =>
    ref.rootTitle ? `${ref.rootTitle} › ${ref.title}` : ref.title;
