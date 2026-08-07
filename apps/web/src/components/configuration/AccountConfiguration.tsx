import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { toast } from "react-toastify";
import logoutRequest from "../../services/authentication/request/logoutRequest";
import { persistor } from "../../redux/store";

/**
 * Sair da conta — uma linha só, no tom destrutivo, como no mockup.
 *
 * O botão vivia no `header.tsx`, apagado quando a sidebar nasceu: desde então
 * não havia como encerrar a sessão pela interface. O redux-persist é purgado
 * antes do redirect, senão o próximo usuário desta máquina veria os dados do
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
