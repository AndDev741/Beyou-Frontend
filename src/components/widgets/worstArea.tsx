import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv";
import category from "../../types/category/categoryType";
import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";
import { IconObject } from "../../types/icons/IconObject";

export type worstAreaProps = {
    category: category | null;
}

export default function WorstArea({category}: worstAreaProps){
    const {t} = useTranslation();
    const [Icon, setIcon] = useState<IconObject>();

    useEffect(() => {
        if(category){
            const response = iconSearch(category.iconId) ;
            setIcon(response as IconObject);
        }
    }, [category]);

    
    if(!category) {
        return null;
    }
    const actualProgress = Math.round(((category.xp - category.actualLevelXp) / (category.nextLevelXp - category.actualLevelXp)) * 100);

    return (
        <BaseDiv title={t('Worst Area')}>
            <div className="flex items-center justify-center w-full">
                <p className="text-[25px] text-primary">
                {Icon !== undefined && Icon !== null ? <Icon.IconComponent/> : null}
                </p>
                <h3 className={`text-lg text-primary md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1`}>{category.name}</h3>
            </div>
            <div className="flex w-full">
                <div className="border border-error bg-error h-[15px] rounded-l-xl"
                style={{width: `${actualProgress}%`}}></div>
                <div className="border border-error bg-error/10 h-[15px] rounded-r-xl"
                style={{width: `${100 - actualProgress}%`}}></div>
            </div>
            <h3 className="text-secondary">LV {category.level}</h3>
        </BaseDiv>
    )
}
