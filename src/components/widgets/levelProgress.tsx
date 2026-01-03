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
                <span className="text-2xl font-bold text-primary">LV {level}</span>
            </div>

            <div className="w-full mt-1 bg-primary/10 border border-primary/30 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                    className="border border-primary bg-primary h-[15px] rounded-l-xl"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex w-full items-center justify-between text-xs text-description mt-1">
                <span>{xp} XP</span>
                <span>{nextLevelXp} XP</span>
            </div>
        </BaseDiv>
    );
}
