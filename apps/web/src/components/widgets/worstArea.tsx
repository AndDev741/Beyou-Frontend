import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv";
import category from "@beyou/types/category/categoryType";
import BeyouIcon from "../../ui/BeyouIcon";

export type worstAreaProps = {
    categoriePassed: category | null;
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

export default function WorstArea({categoriePassed}: worstAreaProps){
    const {t} = useTranslation();
    const categoryToUse = categoriePassed ?? categoryExample;

    const actualProgress = Math.round(((categoryToUse.xp - categoryToUse.actualLevelXp) / (categoryToUse.nextLevelXp - categoryToUse.actualLevelXp)) * 100);

    return (
        <BaseDiv title={t('Worst Area')}>
            <div className="flex items-center justify-center w-full">
                <p className="text-[25px] text-accent">
                    <BeyouIcon id={categoryToUse.iconId} />
                </p>
                <h3 className={`text-lg text-accent md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1`}>{categoryToUse.name}</h3>
            </div>
            <div className="flex w-full">
                <div className="border border-danger bg-danger h-[15px] rounded-l-xl transition-all duration-700 ease-out"
                style={{width: `${actualProgress}%`}}></div>
                <div className="border border-danger bg-danger/10 h-[15px] rounded-r-xl transition-all duration-700 ease-out"
                style={{width: `${100 - actualProgress}%`}}></div>
            </div>
            <h3 className="text-text">LV {categoryToUse.level}</h3>
        </BaseDiv>
    )
}
