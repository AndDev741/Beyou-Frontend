import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { getPage, savePageContent } from "@beyou/api/notebook";
import { DocumentSync, type ConflictChoice, type MergeResult, type ServerPage } from "@beyou/state";
import type { NotebookEditorHandle } from "./NotebookEditor";

export type SaveState = "idle" | "saving" | "saved" | "failed";

/**
 * The page screen's side of {@link DocumentSync}: one per page on screen, saving through the
 * API, reading the page again when a save is refused, and the conflict, if any, as state for
 * the dialog.
 */
export function useDocumentSync(pageId: string | undefined, editorRef: RefObject<NotebookEditorHandle | null>) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<SaveState>("idle");
    const [conflict, setConflict] = useState<MergeResult | null>(null);

    const sync = useMemo(() => {
        if (!pageId) return null;
        return new DocumentSync({
            save: async (content, baseRevision) => {
                const response = await savePageContent(pageId, content, baseRevision, t);
                if (response.success) return { saved: true, revision: response.success.contentRevision };
                return { saved: false, conflict: response.error?.errorKey === "NOTEBOOK_CONTENT_CONFLICT" };
            },
            fetchPage: async () => {
                const response = await getPage(pageId, t);
                return response.success ?? null;
            },
            editor: () => editorRef.current,
            onStatus: setStatus,
            onConflict: setConflict,
        });
    }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        sync?.open();
        setStatus("idle");
        setConflict(null);
        return () => sync?.close();
    }, [sync]);

    const onReady = useCallback(
        (document: string, revision: number, hadBlocksWithoutIds: boolean) => sync?.ready(document, revision, hadBlocksWithoutIds),
        [sync]
    );
    const onSave = useCallback(async (json: string) => sync?.requestSave(json), [sync]);
    const serverChanged = useCallback((page: ServerPage) => sync?.serverChanged(page), [sync]);
    const resolve = useCallback((choices: Record<string, ConflictChoice>) => sync?.resolve(choices), [sync]);

    return { status, conflict, onReady, onSave, serverChanged, resolve };
}
