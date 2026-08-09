import BaseDiv from "./baseDiv";
import { useTranslation } from "react-i18next";
import { Award } from "lucide-react";

export type levelProgressProps = {
    level: number;
    xp: number;
    nextLevelXp: number;
    actualLevelXp: number;
};

export default function LevelProgress({ level, xp, nextLevelXp, actualLevelXp }: levelProgressProps) {
    const { t } = useTranslation();

    // The level's window, not total XP: without the floor a high level would start the
    // bar nearly full.
    const xpWindow = Math.max(nextLevelXp - actualLevelXp, 1);
    const progress = Math.min(100, Math.max(0, Math.round(((xp - actualLevelXp) / xpWindow) * 100)));

    return (
        <BaseDiv title={`${t("Level")} ${level}`} icon={<Award size={14.5} aria-hidden="true" />}>
            <div className="mt-3 h-2 overflow-hidden rounded-[5px] bg-surface-2">
                <div
                    className="h-full rounded-[5px] bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="mt-[7px] flex justify-between font-mono text-[11px] font-medium text-text-3">
                <span>{xp} XP</span>
                <span>{nextLevelXp}</span>
            </div>
        </BaseDiv>
    );
}
