import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { createTopic } from "@beyou/api/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import Modal from "../modals/Modal";

/** A blank topic: a title and, if the person wants, one line on why. Links come later, on its page. */
export default function NewTopicModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!title.trim()) return;
        setBusy(true);
        const response = await createTopic({ title: title.trim(), description: description.trim() || null }, t);
        setBusy(false);
        if (!response.success) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        onClose();
        navigate(`/notebook/${response.success.id}`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy="new-topic-title">
            <form
                className="flex w-full flex-col gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <h2 id="new-topic-title" className="text-lg font-semibold text-text">{t("NotebookNewTopic")}</h2>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("NotebookTopicTitleLabel")}
                    <input autoFocus value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} data-testid="new-topic-title"
                        placeholder={t("NotebookTopicTitlePlaceholder")}
                        className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("NotebookTopicWhyLabel")}
                    <textarea value={description} maxLength={512} rows={2} onChange={(e) => setDescription(e.target.value)}
                        className="resize-none rounded-control border border-border bg-surface p-3 text-sm font-normal text-text outline-none focus:border-accent" />
                </label>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">{t("Cancel")}</button>
                    <button type="submit" disabled={busy || !title.trim()} data-testid="new-topic-submit"
                        className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
                        {t("NotebookCreateTopic")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
