import { useTranslation } from "react-i18next";
import { secondBrainAreaEnds } from "@beyou/state";
import type { SecondBrainArea } from "@beyou/types/secondBrain/secondBrain";
import BeyouIcon from "../../ui/BeyouIcon";
import Chip from "../../ui/Chip";
import Block from "./Block";

type AreasBlockProps = {
    areas: SecondBrainArea[];
    /** False when the routines source is off. */
    enabled: boolean;
};

/**
 * Strong and weak, by category. A category is the person's own name for a part of their life,
 * so ranking them answers "where am I doing well" in their words.
 *
 * The server sends them sorted. Which rows get a label is a rule shared with the phone app.
 */
export default function AreasBlock({ areas, enabled }: AreasBlockProps) {
    const { t } = useTranslation();

    const ends = secondBrainAreaEnds(areas);

    return (
        <Block
            title={t("SecondBrainAreasTitle")}
            hint={enabled && areas.length > 0 ? t("SecondBrainAreasHint") : undefined}
            testId="second-brain-areas"
        >
            {!enabled ? (
                <p className="text-sm text-text-2">{t("SecondBrainSourceOffBlock")}</p>
            ) : areas.length === 0 ? (
                <p className="max-w-[56ch] text-sm leading-relaxed text-text-2">{t("SecondBrainAreasEmpty")}</p>
            ) : (
                <ul className="flex flex-col gap-4">
                    {areas.map((area) => {
                        const percent = area.percent;
                        return (
                            <li key={area.categoryId} data-testid="second-brain-area">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <BeyouIcon id={area.iconId} size={16} className="shrink-0 text-text-2" showFallback />
                                        <span className="truncate text-sm font-medium text-text">{area.name}</span>
                                        {ends?.strongestId === area.categoryId && (
                                            <Chip variant="ok" size="sm">
                                                {t("SecondBrainAreaStrongest")}
                                            </Chip>
                                        )}
                                        {ends?.weakestId === area.categoryId && (
                                            <Chip variant="flame" size="sm">
                                                {t("SecondBrainAreaWeakest")}
                                            </Chip>
                                        )}
                                    </span>
                                    <span className="shrink-0 font-mono text-xs text-text-2">
                                        {percent != null ? `${percent}%` : t("SecondBrainAreaNoData")}
                                    </span>
                                </div>
                                {percent != null && (
                                    <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2">
                                        <div
                                            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                        />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Block>
    );
}
