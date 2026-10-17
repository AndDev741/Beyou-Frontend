import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { createQuickNote } from "@beyou/api/quickNote/quickNoteApi";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { quickNoteUpserted } from "@beyou/state";
import Modal from "../modals/Modal";
import CaptureField from "./CaptureField";
import { isEditableTarget, isModalOpen, isQuickCaptureShortcut } from "./quickCapture";

/** The Ideas page has a capture field of its own; there Alt+N only focuses it. */
const IDEAS_ROUTE = "/ideas";

/**
 * Alt+N from any signed-in page: a small "New idea" dialog with the capture field. Enter saves
 * the note, the dialog closes and a toast says where it went. The note lands in the board's first
 * free cell, the same as one typed on the page.
 *
 * Mounted once in the shell (ProtectedRoute) and renders nothing until the shortcut is pressed.
 * The shortcut is ignored inside text fields (see `isEditableTarget`) and while another dialog is
 * open.
 */
export default function QuickCaptureHub() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const titleId = useId();
    const pathRef = useRef(pathname);
    pathRef.current = pathname;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isQuickCaptureShortcut(event)) return;
            if (pathRef.current === IDEAS_ROUTE) return;
            if (isEditableTarget(event.target) || isModalOpen()) return;
            event.preventDefault();
            setError(null);
            setOpen(true);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const save = async (text: string) => {
        setError(null);
        const response = await createQuickNote({ text }, t);
        if (response.success) {
            dispatch(quickNoteUpserted(response.success));
            setOpen(false);
            toast.success(t("IdeasCapturedToast"));
            return true;
        }
        setError(response.error ?? { message: t("UnexpectedError") });
        return false;
    };

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} labelledBy={titleId} className="max-w-md">
            <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-text">
                {t("IdeasCaptureLabel")}
            </h2>
            <p className="mb-3 mt-1 text-[12.5px] text-text-3">{t("IdeasSubtitle")}</p>
            <CaptureField
                id="quick-capture-input"
                autoFocus
                onSubmit={save}
                error={error}
                onDismissError={() => setError(null)}
            />
        </Modal>
    );
}
