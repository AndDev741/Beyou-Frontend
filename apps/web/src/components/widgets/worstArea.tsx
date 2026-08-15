import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv";
import category from "@beyou/types/category/categoryType";
import BeyouIcon from "../../ui/BeyouIcon";
import XpSparkline from "../../ui/XpSparkline";
import { Gauge } from "lucide-react";

export type worstAreaProps = {
    categoriePassed: category | null;
    /** XP per day for that category, oldest first. Absent until the window loads. */
    xpSeries?: number[];
}

const categoryExample: category = {
    id: "differentsksks",
    iconId: "lucide:dumbbell",
    name: "Bad Example",
    xp: 150,
    actualLevelXp: 100,
    nextLevelXp: 300,
    level: 2,
    description: "Just a mock",
    createdAt: new Date()
}

export default function WorstArea({categoriePassed, xpSeries}: worstAreaProps){
    const {t} = useTranslation();
    const categoryToUse = categoriePassed ?? categoryExample;
    const window = Math.max(categoryToUse.nextLevelXp - categoryToUse.actualLevelXp, 1);
    const progress = Math.min(
        100,
        Math.max(0, Math.round(((categoryToUse.xp - categoryToUse.actualLevelXp) / window) * 100)),
    );

    return (
        <BaseDiv title={t('Worst Area')} icon={<Gauge size={14.5} aria-hidden="true" />}>
            <div className="mt-3 flex items-center gap-2.5">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-flame-soft text-flame">
                    <BeyouIcon id={categoryToUse.iconId} />
                </span>
                <div className="min-w-0">
                    <b className="block truncate text-sm font-semibold text-text">{categoryToUse.name}</b>
                    <span className="font-mono text-[10.5px] text-text-3">
                        LV {categoryToUse.level} · {categoryToUse.xp}/{categoryToUse.nextLevelXp} XP
                    </span>
                </div>
            </div>

            {/* The mockup's weekly bars, now that GET /xp/history answers for them.
                Without a window yet — the request is still out, or this account has no
                history at all — it falls back to the level bar, which is what the
                widget showed for months while the series did not exist. */}
            {xpSeries && xpSeries.length > 0 ? (
                <XpSparkline
                    values={xpSeries}
                    tone="warm"
                    labels={[t("WeekdayShortFirst"), t("WeekdayShortLast")]}
                    summary={t("XpLastDaysFor", { name: categoryToUse.name, count: xpSeries.length })}
                />
            ) : (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                        className="h-full rounded-full bg-flame transition-[width] duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </BaseDiv>
    )
}
