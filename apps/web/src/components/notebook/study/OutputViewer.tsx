import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FileText, Trash2, X } from "lucide-react";
import type { Citation, StudyOutput } from "@beyou/types/notebook/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { appendToPage, deleteStudyOutput } from "@beyou/api/notebook";
import Modal from "../../modals/Modal";
import NotebookMarkdown from "../NotebookMarkdown";
import CitationPanel from "../CitationPanel";
import { OUTPUT_KIND_KEY } from "./outputLabels";

type Props = {
    pageId: string;
    output: StudyOutput | null;
    onClose: () => void;
    onDeleted: (id: string) => void;
};

/** A summary or study guide, readable in full, with its citations and a way into the page. */
export default function OutputViewer({ pageId, output, onClose, onDeleted }: Props) {
    const { t } = useTranslation();
    const [citation, setCitation] = useState<Citation | null>(null);
    const [busy, setBusy] = useState(false);

    if (!output) return null;

    const saveToPage = async () => {
        if (!output.markdown) return;
        setBusy(true);
        const response = await appendToPage(pageId, output.markdown, t);
        setBusy(false);
        if (response.success) toast.success(t("NotebookStudySavedToPage"));
        else toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const remove = async () => {
        setBusy(true);
        const response = await deleteStudyOutput(output.id, t);
        setBusy(false);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        onDeleted(output.id);
        onClose();
    };

    return (
        <Modal isOpen onClose={onClose} labelledBy="study-output-title" className="max-w-2xl">
            <div className="flex items-start gap-3" data-testid="study-output-viewer">
                <h2 id="study-output-title" className="flex-1 text-lg font-semibold text-text">
                    {t(OUTPUT_KIND_KEY[output.kind])} · {output.title}
                </h2>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-control p-1.5 text-text-2 hover:bg-surface-2">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>
            <div className="mt-4">
                <NotebookMarkdown markdown={output.markdown ?? ""} citations={output.citations} onCitation={setCitation} />
            </div>
            {citation && (
                <div className="mt-3">
                    <CitationPanel citation={citation} onClose={() => setCitation(null)} />
                </div>
            )}
            <div className="mt-5 flex flex-wrap justify-between gap-2">
                <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                >
                    <Trash2 size={15} aria-hidden="true" />
                    {t("Delete")}
                </button>
                <button
                    type="button"
                    onClick={saveToPage}
                    disabled={busy}
                    data-testid="study-output-save"
                    className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60"
                >
                    <FileText size={15} aria-hidden="true" />
                    {t("NotebookStudySaveToPage")}
                </button>
            </div>
        </Modal>
    );
}
