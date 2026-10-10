import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Link2, AlignLeft } from "lucide-react";
import type { NotebookSource } from "@beyou/types/notebook/notebook";
import { MAX_SOURCE_PDF_BYTES } from "@beyou/types/notebook/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { addLinkSource, addPdfSource, addTextSource } from "@beyou/api/notebook";
import Modal from "../../modals/Modal";
import AiPrivacyNotice from "../../agent/AiPrivacyNotice";
import ErrorNotice from "../../ErrorNotice";

type Tab = "pdf" | "link" | "text";

type Props = {
    pageId: string;
    isOpen: boolean;
    onClose: () => void;
    onAdded: (source: NotebookSource) => void;
};

/**
 * Adds a source to the page: a PDF, a link, or pasted text. Each is read in the background, so
 * the dialog closes as soon as the server has the row and the list shows the reading progress.
 *
 * The 15 MB limit is checked here too, before the upload starts, so a large book is refused in
 * a second instead of after a long upload the server then turns away.
 */
export default function AddSourceDialog({ pageId, isOpen, onClose, onAdded }: Props) {
    const { t } = useTranslation();
    const titleId = useId();
    const [tab, setTab] = useState<Tab>("pdf");
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState("");
    const [textTitle, setTextTitle] = useState("");
    const [text, setText] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [busy, setBusy] = useState(false);

    const reset = () => {
        setFile(null);
        setUrl("");
        setTextTitle("");
        setText("");
        setLocalError(null);
        setError(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const pickFile = (picked: File | null) => {
        setError(null);
        if (picked && picked.size > MAX_SOURCE_PDF_BYTES) {
            setFile(null);
            setLocalError(t("NotebookStudyPdfTooLarge"));
            return;
        }
        setLocalError(null);
        setFile(picked);
    };

    const canSubmit =
        !busy &&
        ((tab === "pdf" && file !== null) ||
            (tab === "link" && url.trim().length > 0) ||
            (tab === "text" && textTitle.trim().length > 0 && text.trim().length > 0));

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        const response =
            tab === "pdf" && file
                ? await addPdfSource(pageId, file, file.name, t)
                : tab === "link"
                  ? await addLinkSource(pageId, url.trim(), t)
                  : await addTextSource(pageId, textTitle.trim(), text, t);
        setBusy(false);
        if (response.success) {
            onAdded(response.success);
            close();
        } else {
            setError(response.error ?? null);
        }
    };

    const tabs: { id: Tab; label: string; Icon: typeof FileText }[] = [
        { id: "pdf", label: t("NotebookStudyAddPdf"), Icon: FileText },
        { id: "link", label: t("NotebookStudyAddLink"), Icon: Link2 },
        { id: "text", label: t("NotebookStudyAddText"), Icon: AlignLeft },
    ];

    return (
        <Modal isOpen={isOpen} onClose={close} labelledBy={titleId}>
            <form onSubmit={submit} className="flex flex-col gap-4" data-testid="study-add-source-dialog">
                <h2 id={titleId} className="text-lg font-semibold text-text">
                    {t("NotebookStudyAddSourceTitle")}
                </h2>
                <AiPrivacyNotice messageKey="NotebookSourcePrivacyNotice" testId="study-source-privacy-notice" />
                <div role="tablist" aria-label={t("NotebookStudyAddSourceTitle")} className="flex gap-1 rounded-control bg-surface-2 p-1">
                    {tabs.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => {
                                setTab(id);
                                setError(null);
                                setLocalError(null);
                            }}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
                                tab === id ? "bg-surface text-text shadow-sm" : "text-text-2 hover:text-text"
                            }`}
                        >
                            <Icon size={15} aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "pdf" && (
                    <label className="flex flex-col gap-2 text-sm text-text-2">
                        <span className="font-semibold text-text">{t("NotebookStudyPdfLabel")}</span>
                        <input
                            type="file"
                            accept="application/pdf"
                            data-testid="study-pdf-input"
                            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                            className="rounded-control border border-dashed border-border bg-bg p-3 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:font-semibold file:text-accent"
                        />
                        <span>{t("NotebookStudyPdfHint")}</span>
                    </label>
                )}

                {tab === "link" && (
                    <label className="flex flex-col gap-2 text-sm text-text-2">
                        <span className="font-semibold text-text">{t("NotebookStudyLinkLabel")}</span>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://"
                            data-testid="study-link-input"
                            className="h-11 rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
                        />
                        <span>{t("NotebookStudyLinkHint")}</span>
                    </label>
                )}

                {tab === "text" && (
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="font-semibold text-text">{t("NotebookStudyTextTitleLabel")}</span>
                            <input
                                value={textTitle}
                                maxLength={255}
                                onChange={(e) => setTextTitle(e.target.value)}
                                data-testid="study-text-title"
                                className="h-11 rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="font-semibold text-text">{t("NotebookStudyTextLabel")}</span>
                            <textarea
                                value={text}
                                rows={8}
                                maxLength={200_000}
                                onChange={(e) => setText(e.target.value)}
                                data-testid="study-text-body"
                                className="rounded-control border border-border bg-surface p-3 text-sm leading-6 text-text outline-none focus:border-accent"
                            />
                        </label>
                    </div>
                )}

                {localError && <p className="text-sm text-danger">{localError}</p>}
                <ErrorNotice error={error} canReport={false} />

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={close}
                        className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2"
                    >
                        {t("Cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        data-testid="study-add-source-submit"
                        className="h-10 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {busy ? t("NotebookStudyAdding") : t("NotebookStudyAddSourceSubmit")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
