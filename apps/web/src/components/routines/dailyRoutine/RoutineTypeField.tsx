import { useTranslation } from "react-i18next";
import SegmentedControl from "../../../ui/SegmentedControl";

/**
 * O tipo da rotina. Hoje só existe "diária" — a de lista está desenhada mas não
 * implementada, e aparece desabilitada em vez de escondida: quem abre o
 * formulário vê que existe um segundo formato a caminho.
 *
 * Substitui a bifurcação de duas ilustrações que abria o fluxo de criação; o
 * formulário agora começa direto no que 100% dos usuários vão escolher.
 */
export default function RoutineTypeField() {
    const { t } = useTranslation();

    return (
        <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                {t("RoutineTypeLabel")}
            </span>
            <SegmentedControl
                className="w-full"
                label={t("RoutineTypeLabel")}
                value="daily"
                onChange={() => {}}
                options={[
                    { value: "daily", label: t("RoutineTypeDaily") },
                    { value: "list", label: t("RoutineTypeList"), disabled: true },
                ]}
            />
        </div>
    );
}
