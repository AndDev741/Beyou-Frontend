import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import exportUserData from "@beyou/api/user/exportUserData";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import DeleteAccountModal from "./DeleteAccountModal";

/**
 * The two things that only belong together: take your data with you, and leave.
 *
 * `GET /user/export` has existed with no way to reach it. Here is where wanting a
 * copy of everything is most likely, and offering it beside the delete button is
 * the difference between leaving and losing.
 */
export default function DangerZone({ className = "" }: { className?: string }) {
    const { t } = useTranslation();
    const [downloading, setDownloading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const onDownload = async () => {
        setDownloading(true);
        const response = await exportUserData();
        setDownloading(false);
        if (response.error || !response.data) {
            toast.error(
                response.error ? getFriendlyErrorMessage(t, response.error) : t("DownloadMyDataFailed")
            );
            return;
        }

        // Straight to a file: the export is one JSON object, and a browser tab full
        // of raw JSON is not "your data" to anybody.
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `beyou-data-${new Date().toISOString().slice(0, 10)}.json`;
        // In the document before the click, revoked a beat after it. A detached anchor
        // and a URL revoked in the same task both happen to work in current Chrome and
        // neither has been dependable across browsers — and the failure is silent: no
        // throw, no toast, just no file. This is the copy someone takes immediately
        // before deleting everything, so silent is the one thing it must not be.
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <section
            aria-labelledby="danger-zone-title"
            className={`rounded-card border border-danger/30 bg-surface p-4 lg:p-5 ${className}`}
        >
            <h2 id="danger-zone-title" className="text-[13.5px] font-semibold text-danger lg:text-sm">
                {t("ConfigSectionDangerZone")}
            </h2>

            <div className="mt-3 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => void onDownload()}
                    disabled={downloading}
                    data-testid="export-my-data"
                    className="flex w-full items-center gap-3 rounded-control border border-border p-3 text-left transition-colors duration-200 hover:border-accent/40 disabled:opacity-60"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                        <Download size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-text">{t("DownloadMyData")}</span>
                        <span className="block text-[12px] leading-snug text-text-3">{t("DownloadMyDataHint")}</span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setDeleting(true)}
                    data-testid="delete-my-account"
                    className="flex w-full items-center gap-3 rounded-control border border-border p-3 text-left transition-colors duration-200 hover:border-danger/40"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-danger/10 text-danger">
                        <Trash2 size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-danger">{t("DeleteMyAccount")}</span>
                        <span className="block text-[12px] leading-snug text-text-3">{t("DeleteAccountHint")}</span>
                    </span>
                </button>
            </div>

            {/* Mounted only while it is open, so closing it throws the half-finished
                deletion away rather than leaving it to be replayed on the first frame
                of the next opening — and so a request abandoned on the way out has
                nothing left to write into. */}
            {deleting && <DeleteAccountModal isOpen onClose={() => setDeleting(false)} />}
        </section>
    );
}
