import type { StudyOutputKind } from "@beyou/types/notebook/notebook";

/** The kind's name, for "Summary · Trees". The title the server keeps is only the page's. */
export const OUTPUT_KIND_KEY: Record<StudyOutputKind, string> = {
    OVERVIEW: "NotebookStudyOverviewTitle",
    SUMMARY: "NotebookStudyKindSummary",
    STUDY_GUIDE: "NotebookStudyKindGuide",
    QUIZ: "NotebookStudyKindQuiz",
};
