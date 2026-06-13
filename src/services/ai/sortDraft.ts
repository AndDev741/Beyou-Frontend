import { RoutineDraft } from "../../types/ai/routineDraft";

const byStartTime = (a?: string | null, b?: string | null) =>
    (a ?? "99:99").localeCompare(b ?? "99:99");

/**
 * Sorts a draft chronologically: sections by startTime, and habits/tasks
 * inside each section by startTime. Applied once when a draft arrives from
 * the AI so the preview AND the persisted order both follow the clock —
 * mirrors how SectionItem orders items in the create/edit form.
 */
export const sortDraft = (draft: RoutineDraft): RoutineDraft => ({
    ...draft,
    sections: [...draft.sections]
        .sort((a, b) => byStartTime(a.startTime, b.startTime))
        .map((section) => ({
            ...section,
            habits: [...(section.habits ?? [])].sort((a, b) => byStartTime(a.startTime, b.startTime)),
            tasks: [...(section.tasks ?? [])].sort((a, b) => byStartTime(a.startTime, b.startTime))
        }))
});
