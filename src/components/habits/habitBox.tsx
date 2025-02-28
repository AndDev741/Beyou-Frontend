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

function HabitBox({id, iconId, name, description, level, xp, nextLevelXp, actualBaseXp, constance, categories, motivationalPhrase, importance, dificulty}: habit){
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

    useEffect(() => {
        const dificultyAndImportanceColors = {
            1: "#8EB2C5",
            2: "#F9BF76",
            3: "#E5625C",
            4: "#D1313D"
        }
    
        const dificultyPhrases = {
            1: t('Easy'),
            2: t('Normal'),
            3: t('Hard'),
            4: t('Terrible')
        }
    
        const importancePhrases = {
            1: t('Low'),
            2: t('Medium'),
            3: t('High'),
            4: t('Max')
        }

        switch(dificulty){
            case 1: 
                setDificultyColor(dificultyAndImportanceColors[1]);
                setDificultyPhrase(dificultyPhrases[1]);
                break;
            case 2: 
                setDificultyColor(dificultyAndImportanceColors[2]);
                setDificultyPhrase(dificultyPhrases[2]);
                break;
            case 3: 
                setDificultyColor(dificultyAndImportanceColors[3]);
                setDificultyPhrase(dificultyPhrases[3]);
                break;
            case 4: 
                setDificultyColor(dificultyAndImportanceColors[4]);
                setDificultyPhrase(dificultyPhrases[4]);
                break;
            default:
                setDificultyColor("");
                break;
        }

        switch(importance){
            case 1: 
                setImportanceColor(dificultyAndImportanceColors[1]);
                setImportancePhrase(importancePhrases[1]);
                break;
            case 2: 
                setImportanceColor(dificultyAndImportanceColors[2]);
                setImportancePhrase(importancePhrases[2]);
                break;
            case 3: 
                setImportanceColor(dificultyAndImportanceColors[3]);
                setImportancePhrase(importancePhrases[3]);
                break;
            case 4: 
                setImportanceColor(dificultyAndImportanceColors[4]);
                setImportancePhrase(importancePhrases[4]);
                break;
            default:
                setImportanceColor("");
                break;
        }
    }, [dificulty, importance, t])

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

    async function handleDelete(){

    }

    return(
        <div className={`relative flex flex-col justify-between w-[47vw] md:w-[350px] lg:w-[230px] ${expanded ? "min-h-[300px]" : "min-h-[150px]"} border-blueMain border-[1px] rounded-md p-1 break-words my-1 mt-2 lg:mx-1 transition-all duration-500 ease-in-out`}>
            <div className="flex justify-between items-start">
                <div className="flex items-start">
                    <p className="text-blueMain text-[34px]">
                        {Icon !== undefined ? <Icon.IconComponent/> : null}
                    </p>
                    <h2 className={`text-xl ml-1 font-semibold ${expanded ? "line-clamp-none" : "line-clamp-1"}`}>{name}</h2>
                </div>
                <img className="w-[30px] cursor-pointer"
                alt={t('ExpandBoxImgAlt')}
                src={expandendIcon}
                onClick={handleExpanded}/>
            </div>

            <div className={`${expanded ? "line-clamp-none" : "line-clamp-2"} leading-tight`}>
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
                <ul className="ml-6">
                    <li className="list-disc">Study Routine</li>
                    <li className="list-disc">Morning Routine</li>
                </ul>
            </div>

            <div className={`${expanded && motivationalPhrase ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-md">{t('MotivationPhrase')}:</h4>
                <p>{motivationalPhrase}</p>
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
                    <p><span className="text-blueMain">{xp}</span>/{nextLevelXp}</p>
                </div>
                <div className="flex w-[100%]">
                    <div className={`border-[1px] border-darkBlue bg-blueMain h-[15px] rounded-l-xl`}
                    style={{width: `${actualProgress}%`}}></div>
                    <div className={`border-[1px] border-darkBlue bg-ligthGray  h-[15px] rounded-r-xl`}
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
                        <p><span className="text-blueMain">{xp}</span>/{nextLevelXp}xp</p>
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
                <button onClick={handleEditMode}
                className="bg-blueMain mb-2 hover:bg-ligthBlue text-white font-semibold w-[100px] h-[28px] rounded-md">
                    {t('Edit')}
                </button>
                <button onClick={() => setOnDelete(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold w-[90px] h-[25px] rounded-md">
                    {t('Delete')}
                </button>
                <DeleteModal
                habitId={id}
                onDelete={onDelete}
                setOnDelete={setOnDelete}
                t={t}
                name={name}
                />
                </div>
           
        </div>
    )
}
type deleteProps = {
    habitId: string, 
    onDelete: boolean, 
    setOnDelete: React.Dispatch<React.SetStateAction<boolean>>
    t: TFunction, 
    name: string
}

function DeleteModal({habitId, onDelete, setOnDelete, t, name}: deleteProps){

    const handleDelete = async () => {
        const response = await deleteHabit(habitId, t);

        if(response.success){
           window.location.reload();
        }
    }
    return(
        <div className={`${onDelete ? "flex" : "hidden"} flex-col items-center justify-center absolute top-0 left-0 h-[100%] w-[100%] bg-white rounded-md`}>
            <h1 className="text-center font-semibold">{t('ConfirmDeleteOfHabitPhrase')}</h1>
            <h2 className="underline my-3">{name}</h2>
            <div className="flex lg:flex-row flex-col items-center">
                <button onClick={handleDelete}
                className="bg-red-600 hover:bg-red-500 lg:mr-1 text-white font-semibold w-[100px] h-[28px] rounded-md">
                    {t('Delete')}
                </button>
                <button onClick={() => setOnDelete(false)}
                className="bg-gray-600 hover:bg-gray-500 mt-1 lg:mt-0 lg:ml-1 text-white font-semibold w-[100px] h-[28px] rounded-md">
                    {t('Cancel')}
                </button>
            </div>
        </div>
    )
}

export default HabitBox;