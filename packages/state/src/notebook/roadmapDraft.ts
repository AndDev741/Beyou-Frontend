import type {
    CreateFromDraftRequest,
    DraftChoice,
    DraftNode,
    DraftNodeInput,
    RoadmapDraftRecord,
    RoadmapDraftRequest,
    StudyLevel,
} from '@beyou/types/notebook/notebook';

/** How often an open draft is read back while the model is still writing it. */
export const DRAFT_POLL_MS = 2500;
/** How often a list of drafts is read again while one of them is still being written. */
export const DRAFTS_POLL_MS = 4000;
/** Ticks are saved this long after the last change, and at once when the draft is left. */
export const DRAFT_CHOICES_SAVE_MS = 600;
/** The weekly hours a person can pick for a roadmap. */
export const DRAFT_HOURS = [3, 6, 10];

/**
 * Past this many seconds a wait on the notebook AI says what is true: the server asks the model
 * once more on its own before giving up (NotebookLlm on the backend, inside a 90 second budget).
 */
export const AI_SLOW_AFTER_SECONDS = 30;

/** Seconds as m:ss, for how long a model call has been running. */
export const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A drafted node with the person's ticks on it. */
export type DraftRow = DraftNode & { keep: boolean; link: boolean };

/** What the person asked for, as the form holds it. */
export type DraftForm = {
    title: string;
    why: string;
    level: StudyLevel;
    hours: number;
    goalId: string;
    reference: string;
};

export const EMPTY_DRAFT_FORM: DraftForm = { title: '', why: '', level: 'SOME', hours: 6, goalId: '', reference: '' };

/** The drafted nodes with the person's ticks on them, or the defaults where there are none. */
export function draftRows(draft: RoadmapDraftRecord): DraftRow[] | null {
    const nodes = draft.result?.nodes;
    if (!nodes) return null;
    const choices = draft.choices?.length === nodes.length ? draft.choices : null;
    return nodes.map((node, i) => {
        const choice = choices?.[i];
        return {
            ...node,
            keep: choice ? choice.keep : !node.optional,
            link: !!node.existingPageId && (choice ? choice.link : true),
        };
    });
}

/** The ticks to store, one per drafted node. */
export const draftChoices = (rows: DraftRow[]): DraftChoice[] => rows.map((row) => ({ keep: row.keep, link: row.link }));

/** The form a stored draft was asked with, to put it back on screen. */
export const draftForm = (request: RoadmapDraftRequest): DraftForm => ({
    title: request.title,
    why: request.why ?? '',
    level: request.level ?? 'SOME',
    hours: request.hoursPerWeek ?? 6,
    goalId: request.goalId ?? '',
    reference: request.references?.[0] ?? '',
});

/**
 * The request for a first draft, or for a revision: `revision` is the change asked for in words,
 * and the kept rows go along as the draft it applies to.
 */
export function draftRequest(form: DraftForm, revision?: string, rows?: DraftRow[] | null): RoadmapDraftRequest {
    const previous: DraftNodeInput[] | undefined =
        revision && rows ? rows.filter((row) => row.keep).map((row) => ({ title: row.title, subtopics: row.subtopics })) : undefined;
    return {
        title: form.title.trim(),
        why: form.why.trim() || undefined,
        level: form.level,
        hoursPerWeek: form.hours,
        goalId: form.goalId || null,
        references: form.reference.trim() ? [form.reference.trim()] : undefined,
        changeRequest: revision,
        previous,
    };
}

/** The topic to create from the kept rows. A linked node brings its page, so it sends no subtopics. */
export const topicFromDraft = (form: DraftForm, rows: DraftRow[], draftId: string | null): CreateFromDraftRequest => ({
    title: form.title.trim(),
    description: form.why.trim() || null,
    goalId: form.goalId || null,
    nodes: rows
        .filter((row) => row.keep)
        .map((row) => ({
            title: row.title,
            why: row.why,
            subtopics: row.link ? [] : row.subtopics,
            estimatedHours: row.estimatedHours,
            linkPageId: row.link ? row.existingPageId : null,
        })),
    draftId,
});

/** How many nodes are kept, and how many weeks the new ones take at `hours` a week. */
export function draftPlan(rows: DraftRow[] | null, hours: number): { kept: number; weeks: number } {
    const kept = rows?.filter((row) => row.keep) ?? [];
    const newHours = kept.filter((row) => !row.link).reduce((sum, row) => sum + row.estimatedHours, 0);
    return { kept: kept.length, weeks: hours > 0 ? Math.ceil(newHours / hours) : 0 };
}
