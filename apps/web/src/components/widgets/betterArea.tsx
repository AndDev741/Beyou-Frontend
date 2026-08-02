import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv";
import category from "@beyou/types/category/categoryType";
import BeyouIcon from "../../ui/BeyouIcon";
import { ArrowUpRight } from "lucide-react";

export type betterAreaProps = {
    categoriePassed: category | null;
}

const categoryExample: category = {
    id: "dsadsadsa",
    iconId: "lucide:dumbbell",
    name: "Example",
    xp: 450,
    actualLevelXp: 400,
    nextLevelXp: 480,
    level: 6,
    description: "Just a mock",
    createdAt: new Date()
}

export default function BetterArea({categoriePassed}: betterAreaProps){
    const {t} = useTranslation();
    const categoryToUse = categoriePassed ?? categoryExample;
    const window = Math.max(categoryToUse.nextLevelXp - categoryToUse.actualLevelXp, 1);
    const progress = Math.min(
        100,
        Math.max(0, Math.round(((categoryToUse.xp - categoryToUse.actualLevelXp) / window) * 100)),
    );

    return (
        <BaseDiv title={t('Better Area')} icon={<ArrowUpRight size={14.5} aria-hidden="true" />}>
            {/* O mockup traz barras da semana aqui, mas a API não devolve XP por
                categoria por dia — o cartão mostra o que existe (nível e XP) em
                vez de inventar série. Ver docs/redesign/implementation-notes.md. */}
            <div className="mt-3 flex items-center gap-2.5">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-success/10 text-success">
                    <BeyouIcon id={categoryToUse.iconId} />
                </span>
                <div className="min-w-0">
                    <b className="block truncate text-sm font-semibold text-text">{categoryToUse.name}</b>
                    <span className="font-mono text-[10.5px] text-text-3">
                        LV {categoryToUse.level} · {categoryToUse.xp}/{categoryToUse.nextLevelXp} XP
                    </span>
                </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                    className="h-full rounded-full bg-success transition-[width] duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </BaseDiv>
    )
}
