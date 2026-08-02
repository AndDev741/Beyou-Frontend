import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import { getGreetingKey, GreetingKey } from "./getGreetingKey";
import Chip from "../../ui/Chip";

/**
 * O topo do dashboard: saudação, data por extenso e a frase configurável —
 * direto sobre a página, sem cartão.
 *
 * Não há avatar nem anel de nível aqui: quem você é já está no rodapé da
 * sidebar, e o nível tem widget próprio. Repetir os três no cabeçalho era o
 * que empurrava a rotina (o conteúdo que importa) para baixo da dobra.
 */
function Perfil() {
    const { t, i18n } = useTranslation();
    const [now, setNow] = useState(() => new Date());
    const name = useSelector((state: RootState) => state.perfil.username);
    const phrase = useSelector((state: RootState) => state.perfil.phrase);
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author);
    const constance = useSelector((state: RootState) => state.perfil.constance);

    useEffect(() => {
        // A saudação muda de faixa ao longo do dia; a data vira outra à meia-noite.
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const greetingKey: GreetingKey = getGreetingKey(now.getHours());
    const fullDate = new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(now);

    return (
        <header data-tutorial-id="dashboard-profile" className="flex items-start gap-4">
            <div className="min-w-0">
                <h1
                    data-testid="dashboard-greeting"
                    className="truncate text-[23px] font-semibold tracking-[-0.02em] text-text"
                >
                    {t(greetingKey)}, {name}
                </h1>
                <p className="mt-0.5 text-[13px] text-text-3 first-letter:uppercase">{fullDate}</p>

                {phrase && (
                    <p className="mt-3 text-[13px] italic text-text-2">
                        "{phrase}"
                        {phrase_author && (
                            <span className="ml-1 text-xs not-italic text-text-3">· {phrase_author}</span>
                        )}
                    </p>
                )}
            </div>

            {constance > 0 && (
                <Chip
                    variant="flame"
                    className="ml-auto shrink-0"
                    icon={<Flame size={14} aria-hidden="true" />}
                    title={t("StreakExplanation")}
                >
                    {constance} {t("Days", { count: constance })}
                </Chip>
            )}
        </header>
    );
}

export default Perfil;
