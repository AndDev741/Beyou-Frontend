import { useEffect, useState } from "react"
import { useDispatch } from "react-redux";
import { useTranslation } from 'react-i18next';
import {editModeEnter ,idEnter, nameEnter, descriptionEnter, iconEnter} from '../../redux/category/editCategorySlice'
import deleteCategory from "../../services/categories/deleteCategory";
import getCategories from "../../services/categories/getCategories";
import iconSearch from "../icons/iconsSearch"
import increaseIcon from '../../assets/categories/increaseIcon.svg';
import decreaseIcon from '../../assets/categories/decreaseIcon.svg';
import categoryType from "../../types/category/categoryType";
import { IconObject } from "../../types/icons/IconObject";
import DeleteModal from "../DeleteModal";

type props = {id: string, name: string, description: string, iconId: string, level: number, xp: number, 
    nextLevelXp: number, actualLevelXp: number, 
    setCategories: React.Dispatch<React.SetStateAction<categoryType[]>>,
    habits?: Map<string, string>,
    tasks?: Map<string, string>,
    goals?: Map<string, string>

}

function CategoryBox({id, name, description, iconId, level, xp, nextLevelXp, actualLevelXp, setCategories, habits, tasks, goals}: props){
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const [Icon, setIcon]= useState<IconObject>();
    const [expanded, setExpanded] = useState(false);
    const [onDelete, setOnDelete] = useState(false);

    const actualProgress = Math.round(((xp - actualLevelXp) / (nextLevelXp - actualLevelXp)) * 100);
    useEffect(() => {
        const response = iconSearch(iconId);
        setIcon(response);
    }, [iconId]);

    const handleEdit = () => {
        dispatch(editModeEnter(true));
        dispatch(idEnter(id));
        dispatch(nameEnter(name));
        dispatch(descriptionEnter(description));
        dispatch(iconEnter(iconId));
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        })
    }

    return(
        <div className={`flex flex-col justify-between border border-primary rounded-md mb-5 w-[44vw] md:w-[300px] lg:w-[225px] transition-all duration-500 ease-in-out p-2 break-words bg-background text-secondary shadow-sm
        ${expanded ? "min-h-[300px]" : "h-[150px]"} 
        transform ${expanded ? "lg:scale-105 lg:mx-2 shadow-md" : "scale-100"}
        `}>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <p className="text-[35px] text-icon">
                        {Icon !== undefined && Icon !== null ? <Icon.IconComponent/> : null}
                    </p>
                    <h3 className={`text-lg md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] ${expanded ? "line-clamp-none" : " line-clamp-1"}`}>{name}</h3>
                </div>
                <img onClick={() => setExpanded(!expanded)}
                alt=""
                className="w-[25px] pb-3 cursor-pointer hover:scale-105"
                src={expanded ? decreaseIcon : increaseIcon}/>
            </div>

            <p className={`text-[15px] leading-tight text-description ${expanded ? "line-clamp-none my-2" : "line-clamp-2"}`}>{description}</p>

            {(habits?.size || tasks?.size || goals?.size) ? (
                <div className={`${expanded ? "block my-2" : "hidden"}`}>
                    <h2 className="text-lg font-semibold">{t('Using in')}:</h2>
                    <ul className="text-description">
                        {habits && habits.size > 0 ? (
                            <>
                            <li className="font-semibold">{t('Habits')}:</li>
                            {[...habits?.values()].map((name, index) => (
                                <li className="ml-6 list-disc" key={name}>{name}</li>
                            ))}
                            </>
                        ) : null}

                        {tasks && tasks.size > 0 ? (
                            <>
                            <li className="font-semibold">{t('Tasks')}:</li>
                            {[...tasks?.values()].map(name => (
                                <li className="ml-6 list-disc" key={name}>{name}</li>
                            ))}
                            </>
                        ) : null}

                        {goals && goals.size > 0 ? (
                            <>
                            <li className="font-semibold">{t('Goals')}:</li>
                            {[...goals?.values()].map(name => (
                                <li className="ml-6 list-disc" key={name}>{name}</li>
                            ))}
                            </>
                        ) : null}
                    </ul>
                </div>
            ) : (
                <p  className={`${expanded ? "block mb-2 text-sm text-description" : "hidden"}`}>
                    {t('Add this category in a habit, task or goal!')}
                </p>
            )}
           

            <div className="flex flex-col mb-1">
                <div className="flex justify-between">
                    <p>Level {level}</p>
                    <p><span className="text-primary">{xp}</span>/{nextLevelXp}</p>
                </div>
                <div className="flex w-[100%]">
                    <div className={`border border-primary bg-primary h-[15px] rounded-l-xl`}
                    style={{width: `${actualProgress}%`}}></div>
                    <div className={`border border-primary/40 bg-description/20 h-[15px] rounded-r-xl`}
                    style={{width: `${100 - actualProgress}%`}}></div>
                </div>
            </div>

            <div className={`${expanded ? "flex flex-col my-2" : "hidden"} items-center justify-center`}>
                <button onClick={handleEdit}
                className="bg-primary mb-2 hover:bg-primary/90 text-white font-semibold w-[100px] h-[32px] rounded-md transition-colors duration-200">
                    {t('Edit')}
                </button>
                <button onClick={() => setOnDelete(true)}
                className="bg-error hover:bg-error/90 text-white font-semibold w-[90px] h-[28px] rounded-md transition-colors duration-200">
                    {t('Delete')}
                </button>
            </div>
            <DeleteModal objectId={id}
            onDelete={onDelete} 
            setOnDelete={setOnDelete}
            t={t} name={name}
            setObjects={setCategories}
            deleteObject={deleteCategory}
            getObjects={getCategories}
            deletePhrase={t('ConfirmDeleteOfCategoryPhrase')}
            mode="category"
            />
        </div>
    )
}

export default CategoryBox;
