import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv";
import category from "../../types/category/categoryType";
import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";
import { IconObject } from "../../types/icons/IconObject";

export type betterAreaProps = {
    categoriePassed: category | null;
}

const categoryExample: category = {
    id: "dsadsadsa",
    iconId: "MdSportsGymnastics",
    name: "Example",
    xp: 450,
    actualLevelXp: 400,
    nextLevelXp: 480,
    level: 6,
    description: "Just a mock",
    habits: [],
    createdAt: new Date()
}

export default function BetterArea({categoriePassed}: betterAreaProps){
    const {t} = useTranslation();
    const [categoryToUse, setCategoryToUse] = useState<category>(categoryExample);
    const [Icon, setIcon] = useState<IconObject>();

    useEffect(() => {
        if(categoriePassed){
            setCategoryToUse(categoriePassed);
            const response = iconSearch(categoriePassed.iconId) ;
            setIcon(response as IconObject);
        }
    }, [categoriePassed]);

    const actualProgress = Math.round(((categoryToUse.xp - categoryToUse.actualLevelXp) / (categoryToUse.nextLevelXp - categoryToUse.actualLevelXp)) * 100);

    return (
        <BaseDiv title={t('Better Area')}>
            <div className="flex items-center justify-center w-full">
                <p className="text-[25px] text-primary">
                {Icon !== undefined && Icon !== null ? <Icon.IconComponent/> : null}
                </p>
                <h3 className={`text-lg text-primary md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1`}>{categoryToUse.name}</h3>
            </div>
            <div className="flex w-full">
                <div className="border border-primary bg-primary h-[15px] rounded-l-xl"
                style={{width: `${actualProgress}%`}}></div>
                <div className="border border-primary bg-primary/10 h-[15px] rounded-r-xl"
                style={{width: `${100 - actualProgress}%`}}></div>
            </div>
            <h3 className="text-secondary">LV {categoryToUse.level}</h3>
        </BaseDiv>
    )
}
