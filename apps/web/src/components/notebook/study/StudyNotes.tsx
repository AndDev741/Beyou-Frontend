import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookPage } from "@beyou/state";
import { getPage } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import NotebookEditor, { type NotebookEditorHandle } from "../editor/NotebookEditor";
import ConflictDialog from "../editor/ConflictDialog";
import { useDocumentSync } from "../editor/useDocumentSync";
import ExplainPanel from "../ExplainPanel";
import ErrorNotice from "../../ErrorNotice";

/**
 * The page's notes inside the study room, for writing while asking: the same editor and the same
 * sync as the page screen, without the page's header.
 *
 * Anything that changes the document while it is open here ("Save to page" in the chat, an
 * explanation appended) puts the new page in the store, and the effect below merges that
 * revision into the open editor. BlockNote reads its content once, so a change that skipped this
 * path would be saved over by the next autosave.
 */
export default function StudyNotes({ pageId }: { pageId: string }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const page = useSelector((state: RootState) => state.notebook.pages[pageId]);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [explaining, setExplaining] = useState<string | null>(null);
    const editorRef = useRef<NotebookEditorHandle>(null);
    const { status: save, conflict, onReady, onSave, serverChanged, resolve } = useDocumentSync(pageId, editorRef);

    const load = useCallback(async () => {
        const response = await getPage(pageId, t);
        if (response.success) {
            dispatch(enterNotebookPage(response.success));
            setError(null);
        } else {
            setError(response.error ?? null);
        }
    }, [pageId, t, dispatch]);

    // The store may hold this page from an earlier visit; the read brings the current revision.
    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (page) void serverChanged(page);
    }, [page?.id, page?.contentRevision]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <section aria-label={t("NotebookStudyNotesTitle")} data-testid="study-notes"
            className="flex min-w-0 flex-col overflow-x-clip rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">{t("NotebookStudyNotesTitle")}</h2>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-2" aria-live="polite" data-testid="study-notes-save-state">
                        {save === "saving" ? t("NotebookSaving") : save === "saved" ? t("NotebookSaved") : save === "failed" ? t("NotebookSaveFailed") : ""}
                    </span>
                    <Link to={`/notebook/${pageId}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-text-2 hover:bg-surface-2 hover:text-text">
                        <ExternalLink size={13} aria-hidden="true" />{t("NotebookStudyOpenPage")}
                    </Link>
                </div>
            </div>
            {/* The editor pulls itself 54px out on each side to give its block handles room (the
                page screen lines text up with the title that way). On desktop that room is padding
                here; on a phone the handles are touch-only anyway and the overhang is clipped. */}
            <div className="px-4 py-4 lg:px-[54px]">
                <ErrorNotice error={error} />
                {page ? (
                    <NotebookEditor
                        key={page.id}
                        ref={editorRef}
                        onReady={(document, hadBlocksWithoutIds) => onReady(document, page.contentRevision, hadBlocksWithoutIds)}
                        pageId={page.id}
                        pageTitle={page.title}
                        cardsTotal={page.cardsTotal}
                        content={page.content}
                        onSave={onSave}
                        onExplain={setExplaining}
                    />
                ) : (
                    !error && <p className="px-2 text-sm text-text-2">{t("NotebookLoading")}</p>
                )}
                {explaining && (
                    <ExplainPanel
                        pageId={pageId}
                        text={explaining}
                        onClose={() => setExplaining(null)}
                        onAppended={() => {
                            setExplaining(null);
                            void load();
                        }}
                    />
                )}
            </div>
            <ConflictDialog conflict={conflict} onResolve={(choices) => void resolve(choices)} />
        </section>
    );
}
