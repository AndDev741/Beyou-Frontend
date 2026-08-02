import BaseDiv from "./baseDiv";
import { useTranslation } from "react-i18next";

export type levelProgressProps = {
    level: number;
    xp: number;
    nextLevelXp: number;
    actualLevelXp: number;
};

export default function LevelProgress({ level, xp, nextLevelXp, actualLevelXp }: levelProgressProps) {
    const { t } = useTranslation();

    const xpWindow = Math.max(nextLevelXp - actualLevelXp, 1);
    const progress = Math.min(100, Math.max(0, Math.round(((xp - actualLevelXp) / xpWindow) * 100)));

    return (
        <BaseDiv title={t("Your life progress")} bigSize={false}>
            <div className="flex w-full items-start justify-center">
                <span className="text-2xl font-bold text-accent">LV {level}</span>
            </div>

            <div className="w-full mt-1 bg-accent/10 border border-border rounded-full h-4 overflow-hidden shadow-inner">
                <div
                    className="border border-border bg-accent h-[15px] rounded-l-xl transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex w-full items-center justify-between text-xs text-text-2 mt-1">
                <span>{xp} XP</span>
                <span>{nextLevelXp} XP</span>
            </div>
        </BaseDiv>
    );
}
