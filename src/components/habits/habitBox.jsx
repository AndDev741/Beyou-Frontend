import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";
import increaseIcon from '../../assets/categories/increaseIcon.svg'
import decreaseIcon from '../../assets/categories/decreaseIcon.svg'
import fireIcon from '../../assets/habit/fire.svg'
import { useTranslation } from "react-i18next";
import CategoryNameAndIcon from "./categoryNameAndIcon";
import { useDispatch, useSelector } from "react-redux";
import { editIdEnter ,editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editImportanceEnter, editModeEnter, editMotivationalPhraseEnter, editNameEnter } from "../../redux/habit/editHabitSlice";

function HabitBox({id, iconId, name, description, level, xp, nextLevelXp, actualLevelXp, constance, categories, motivationalPhrase, importance, dificulty}){
    const dispatch = useDispatch();
    const {t} = useTranslation();
    const [icon, setIcon] = useState(null);
    const [categoriesIcon, setCategoriesIcon] = useState([])
    const [expanded, setExpanded] = useState(false);
    const [expandendIcon, setExpandedIcon] = useState(increaseIcon)
    const [dificultyColor, setDificultyColor] = useState(0);
    const [dificultyPhrase, setDificultyPhrase] = useState("");
    const [importanceColor, setImportanceColor] = useState(0);
    const [importancePhrase, setImportancePhrase] = useState("");

    const actualProgress = Math.round(((xp - actualLevelXp) / (nextLevelXp - actualLevelXp)) * 100);

    const dificultyColors = {
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

    useEffect(() => {
        switch(dificulty){
            case 1: 
                setDificultyColor(dificultyColors[1]);
                setDificultyPhrase(dificultyPhrases[1]);
                break;
            case 2: 
                setDificultyColor(dificultyColors[2]);
                setDificultyPhrase(dificultyPhrases[2]);
                break;
            case 3: 
                setDificultyColor(dificultyColors[3]);
                setDificultyPhrase(dificultyPhrases[3]);
                break;
            case 4: 
                setDificultyColor(dificultyColors[4]);
                setDificultyPhrase(dificultyPhrases[4]);
                break;
            default:
                setDificultyColor(0);
                break;
        }

        switch(importance){
            case 1: 
                setImportanceColor(dificultyColors[1]);
                setImportancePhrase(importancePhrases[1]);
                break;
            case 2: 
                setImportanceColor(dificultyColors[2]);
                setImportancePhrase(importancePhrases[2]);
                break;
            case 3: 
                setImportanceColor(dificultyColors[3]);
                setImportancePhrase(importancePhrases[3]);
                break;
            case 4: 
                setImportanceColor(dificultyColors[4]);
                setImportancePhrase(importancePhrases[4]);
                break;
            default:
                setImportanceColor(0);
                break;
        }
    }, [])

    const handleExpanded = () => {
        setExpanded(!expanded);
        expanded ? setExpandedIcon(increaseIcon) : setExpandedIcon(decreaseIcon);
    }

    useEffect(() => {
        const response = iconSearch(iconId);
        setIcon(response[0]);
        for(let i = 0; i < categories.length; i++){
            const categoryIcon = iconSearch(categories[i].iconId);
            setCategoriesIcon([...categoriesIcon, categoryIcon[0]]);
        }
    }, [])
    
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
        <div className={`flex flex-col justify-between w-[47vw] md:w-[350px] lg:w-[230px] ${expanded ? "min-h-[300px]" : "min-h-[150px]"} border-blueMain border-[1px] rounded-md p-1 break-words my-1 mt-2 lg:mx-1 transition-all duration-500 ease-in-out`}>
            <div className="flex justify-between">
                <div className="flex items-center">
                    <p className="text-blueMain text-[34px]">
                        {icon != null ? <icon.IconComponent /> : ""}
                    </p>
                    <h2 className={`text-xl ml-1 font-semibold ${expanded ? "line-clamp-none" : "line-clamp-1"}`}>{name}</h2>
                </div>
                <img className="w-[30px] cursor-pointer"
                alt=""
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
                    name={category.name} icon={category.iconId}/>
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
                <button 
                className="bg-red-600 hover:bg-red-500 text-white font-semibold w-[90px] h-[25px] rounded-md">
                    {t('Delete')}
                </button>
            </div>
        </div>
    )
}

export default HabitBox;