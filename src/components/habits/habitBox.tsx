import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";
import increaseIcon from '../../assets/categories/increaseIcon.svg'
import decreaseIcon from '../../assets/categories/decreaseIcon.svg'
import fireIcon from '../../assets/habit/fire.svg'
import { useTranslation } from "react-i18next";
import CategoryNameAndIcon from "./categoryNameAndIcon";
import { useDispatch } from "react-redux";
import { editIdEnter ,editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editImportanceEnter, editModeEnter, editMotivationalPhraseEnter, editNameEnter } from "../../redux/habit/editHabitSlice";
import { habit } from "../../types/habit/habitType";
import { IconObject } from "../../types/icons/IconObject";
import { TFunction } from "i18next";
import deleteHabit from "../../services/habits/deleteHabit";
import category from "../../types/category/categoryType";
import getHabits from "../../services/habits/getHabits";
import { RootState } from "../../redux/rootReducer";
import useColors from "./utils/useColors";
import DeleteModal from "../DeleteModal";

type HabitBoxProps = {
    id: string,
    name: string,
    description: string,
    motivationalPhrase:string,
    iconId: string,
    categories: category[],
    routines: string[],
    importance:number,
    dificulty: number,
    xp: number,
    level: number,
    nextLevelXp: number,
    actualBaseXp: number,
    constance: number,
    createdAt: Date,
    updatedAt: Date,
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>
}

function HabitBox({id, iconId, name, description, level, xp, nextLevelXp, actualBaseXp, constance, categories, motivationalPhrase, importance, dificulty, setHabits}: HabitBoxProps){
    const dispatch = useDispatch();
    
    const {t} = useTranslation();
    const [Icon, setIcon] = useState<IconObject>();
    const [expanded, setExpanded] = useState(false);
    const [expandendIcon, setExpandedIcon] = useState(increaseIcon)
    const [dificultyColor, setDificultyColor] = useState("");
    const [dificultyPhrase, setDificultyPhrase] = useState("");
    const [importanceColor, setImportanceColor] = useState("");
    const [importancePhrase, setImportancePhrase] = useState("");

    const [onDelete, setOnDelete] = useState(false);

    const actualProgress = Math.round(((xp - actualBaseXp) / (nextLevelXp - actualBaseXp)) * 100);

    useColors(dificulty, importance, setDificultyColor, setDificultyPhrase, setImportanceColor, setImportancePhrase, t)
    

    const handleExpanded = () => {
        setExpanded(!expanded);
        expanded ? setExpandedIcon(increaseIcon) : setExpandedIcon(decreaseIcon);
    }

    useEffect(() => {
        const response = iconSearch(iconId);
        setIcon(response);

    }, [iconId]);
    
    function handleEditMode(){
        dispatch(editModeEnter(true));
        dispatch(editIdEnter(id))
        dispatch(editNameEnter(name));
        dispatch(editDescriptionEnter(description));
        dispatch(editMotivationalPhraseEnter(motivationalPhrase));
        dispatch(editIconIdEnter(iconId));
        dispatch(editImportanceEnter(importance));
        dispatch(editDificultyEnter(dificulty));
        dispatch(editCaegoriesIdEnter(categories));
    }

    return(
        <div className={`relative flex flex-col justify-between w-[46vw] md:w-[350px] lg:w-[230px] ${expanded ? "min-h-[300px]" : "min-h-[150px]"} border border-primary rounded-md p-3 break-words my-1 mt-2 lg:mx-1 transition-all duration-500 ease-in-out bg-background text-secondary shadow-sm`}>
            <div className="flex justify-between items-start">
                <div className="flex items-start">
                    <p className="text-icon text-[34px]">
                        {Icon !== undefined ? <Icon.IconComponent/> : null}
                    </p>
                    <h2 className={`text-xl ml-1 font-semibold ${expanded ? "line-clamp-none" : "line-clamp-1"}`}>{name}</h2>
                </div>
                <img className="w-[30px] cursor-pointer"
                alt={t('ExpandBoxImgAlt')}
                src={expandendIcon}
                onClick={handleExpanded}/>
            </div>

            <div className={`${expanded ? "line-clamp-none" : "line-clamp-2"} leading-tight text-description`}>
                <p>{description}</p>
            </div>

            <div className={`${expanded ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-lg">{t('Categories')}:</h4>
                <div className="flex flex-col">
                    {categories.map((category, index) => (
                    <CategoryNameAndIcon key={index}
                    name={category.name} iconId={category.iconId}/>
                    ))}
                </div>
            </div>

            <div className={`${expanded ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-lg">{t('UsingIn')}:</h4>
                <ul className="ml-6 text-description">
                    <li className="list-disc">Study Routine</li>
                    <li className="list-disc">Morning Routine</li>
                </ul>
            </div>

            <div className={`${expanded && motivationalPhrase ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-md">{t('MotivationPhrase')}:</h4>
                <p className="text-description">{motivationalPhrase}</p>
            </div>

            <div className={`${expanded ? "flex" : "hidden"} justify-evenly items-center`}>
                <div className="flex flex-col items-center mr-4">
                    <img className="w-[45px]"
                    alt={t('constanceFireIconAlt')}
                    src={fireIcon} />
                    <div className="flex font-medium">
                        <p>{constance}</p>
                        <p className="ml-2">{t('Days')}</p>
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <div className="flex items-center">
                        <div className={`w-[35px] h-[35px] rounded-full mr-1`} style={{backgroundColor: `${dificultyColor}` }}></div>
                        <p>{dificultyPhrase}</p>
                    </div>
                    <div className="flex items-center">
                        <div className={`w-[35px] h-[35px] rounded-full mr-1 my-1`} style={{backgroundColor: `${importanceColor}` }}></div>
                        <p>{importancePhrase}</p>
                    </div>
                </div>
            </div>

            <div className={`${expanded ? "flex" : "hidden"} flex-col mb-1`}>
                <div className="flex justify-between">
                    <p>Level {level}</p>
                    <p><span className="text-primary">{xp}</span>/{nextLevelXp}</p>
                </div>
                <div className="flex w-[100%]">
                    <div className="border border-primary bg-primary h-[15px] rounded-l-xl"
                    style={{width: `${actualProgress}%`}}></div>
                    <div className="border border-primary/40 bg-description/20 h-[15px] rounded-r-xl"
                    style={{width: `${100 - actualProgress}%`}}></div>
                </div>
            </div>

            <div className={`${expanded ? "hidden" : "flex"} items-center justify-between`}>
                <div>
                    <div className="flex">
                        <p>{t('Level')}</p>
                        <p className="ml-2 font-semibold">{level}</p>
                    </div>

                    <div>
                        <p><span className="text-primary">{xp}</span>/{nextLevelXp}xp</p>
                    </div>
                </div>

                <div className="flex flex-col items-center mr-2">
                    <img className="w-[35px]"
                    alt={t('constanceFireIconAlt')}
                    src={fireIcon} />
                    <div className="flex font-medium">
                        <p>{constance}</p>
                        <p className="ml-2">{t('Days')}</p>
                    </div>
                </div>

                 
            </div>
            <div className={`${expanded ? "flex flex-col my-2" : "hidden"} items-center justify-center`}>
                <button
                onClick={handleEditMode}
                className="bg-primary mb-2 hover:bg-primary/90 text-white font-semibold w-[110px] h-[32px] rounded-md transition-colors duration-200">
                    {t('Edit')}
                </button>
                <button
                onClick={() => setOnDelete(true)}
                className="bg-error hover:bg-error/90 text-white font-semibold w-[110px] h-[32px] rounded-md transition-colors duration-200">
                    {t('Delete')}
                </button>
                <DeleteModal
                objectId={id}
                onDelete={onDelete}
                setOnDelete={setOnDelete}
                t={t}
                name={name}
                setObjects={setHabits}
                deleteObject={deleteHabit}
                getObjects={getHabits}
                deletePhrase={t('DeleteHabitPhrase')}
                />
                </div>
           
        </div>
    )
}

export default HabitBox;
