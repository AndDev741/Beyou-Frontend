import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { LogOut } from "lucide-react";
import { toast } from "react-toastify";
import { RootState } from "@beyou/state/rootReducer";
import logoutRequest from "../../services/authentication/request/logoutRequest";
import { persistor } from "../../redux/store";
import Button from "../Button";

/**
 * Sair da conta. O botão vivia no `header.tsx`, que foi apagado quando a
 * sidebar nasceu — desde então não havia como encerrar a sessão pela
 * interface.
 *
 * Ao sair, o redux-persist é purgado antes do redirect: sem isso o próximo
 * usuário nesta máquina veria os dados do anterior no primeiro paint.
 */
export default function AccountConfiguration() {
    const { t } = useTranslation();
    const email = useSelector((state: RootState) => state.perfil.email);
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
        <div className="w-full">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("Email")}</span>
            <p className="text-[13.5px] text-text-3">{email}</p>

            <div className="mt-4 flex justify-end">
                <Button
                    text={t("Logout")}
                    mode="danger"
                    size="medium"
                    type="button"
                    disabled={leaving}
                    onClick={onLogout}
                    icon={<LogOut size={15} aria-hidden="true" />}
                />
            </div>
        </div>
    );
}
