import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { toast } from "react-toastify";
import { getAnalytics } from "@beyou/api";
import logoutRequest from "../../services/authentication/request/logoutRequest";
import { persistor } from "../../redux/store";

/**
 * Signing out — one row, in the destructive tone, as in the mockup.
 *
 * The button lived in `header.tsx`, deleted when the sidebar was born: since then
 * there was no way to end the session through the interface. redux-persist is purged
 * before the redirect, or the next user of this machine would see the previous
 * anterior no primeiro paint.
 */
export default function AccountConfiguration({ className = "" }: { className?: string }) {
    const { t } = useTranslation();
    const [leaving, setLeaving] = useState(false);

    const onLogout = async () => {
        setLeaving(true);
        const success = await logoutRequest();
        if (!success) {
            setLeaving(false);
            toast.error(t("ErrorLogout"));
            return;
        }
        // Same reason as the purge: leaving the analytics identity behind would
        // merge the next account on this browser into this one.
        getAnalytics().reset();
        await persistor.purge();
        window.location.href = "/";
    };

    return (
        <button
            type="button"
            onClick={onLogout}
            disabled={leaving}
            className={`flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left transition-colors duration-200 hover:border-danger/40 disabled:opacity-60 lg:p-5 ${className}`}
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-danger/10 text-danger">
                <LogOut size={16} aria-hidden="true" />
            </span>
            <span className="text-[14px] font-semibold text-danger lg:text-[15px]">{t("Logout")}</span>
        </button>
    );
}
