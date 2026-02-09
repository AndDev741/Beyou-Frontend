import { useDispatch } from "react-redux";
import { task } from "../../types/tasks/taskType"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { IconObject } from "../../types/icons/IconObject";
import useColors from "../habits/utils/useColors";
import increaseIcon from '../../assets/categories/increaseIcon.svg'
import decreaseIcon from '../../assets/categories/decreaseIcon.svg'
import CategoryNameAndIcon from "../habits/categoryNameAndIcon";
import iconSearch from "../icons/iconsSearch";
import DeleteModal from "../DeleteModal";
import getTasks from "../../services/tasks/getTasks";
import deleteTask from "../../services/tasks/deleteTask";
import { editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editIdEnter, editImportanceEnter, editModeEnter, editNameEnter, editOneTimeTaskEnter } from "../../redux/task/editTaskSlice";
import { MdWarningAmber } from "react-icons/md";
import { CategoryMiniDTO } from "../../types/category/CategoryMiniDTO";

type taskBoxProps = {
    id: string,
    name: string,
    description: string,
    iconId: string,
    categories?: Record<string, CategoryMiniDTO>,
    importance?:number,
    dificulty?: number,
    oneTimeTask: boolean,
    createdAt: Date,
    updatedAt: Date,
    markedToDelete: Date,
    setTasks: React.Dispatch<React.SetStateAction<task[]>>
}

function TaskBox({id, iconId, name, description, categories, importance, dificulty, oneTimeTask, markedToDelete, setTasks}: taskBoxProps){
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

    useEffect(() => {
        const response = iconSearch(iconId);
        setIcon(response);
    }, [iconId]);

    useColors(dificulty!, importance!, setDificultyColor, setDificultyPhrase, setImportanceColor, setImportancePhrase, t);

    const handleExpanded = () => {
        setExpanded(!expanded);
        expanded ? setExpandedIcon(increaseIcon) : setExpandedIcon(decreaseIcon);
    }

    function handleEditMode(){
        dispatch(editModeEnter(true));
        dispatch(editIdEnter(id))
        dispatch(editNameEnter(name));
        dispatch(editDescriptionEnter(description));
        dispatch(editIconIdEnter(iconId));
        dispatch(editImportanceEnter(importance));
        dispatch(editDificultyEnter(dificulty));
        dispatch(editCaegoriesIdEnter(categories));
        dispatch(editOneTimeTaskEnter(oneTimeTask));
    }
    
    return(
        <div className={`relative flex flex-col justify-between ${expanded ? "min-h-[220px]" : "min-h-[100px]"} border border-primary rounded-md p-1 break-words my-1 mt-2 lg:mx-1 transition-all duration-500 ease-in-out bg-background text-secondary`}>
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

            {oneTimeTask && (
                <>
                    <span className="flex items-center text-secondary">
                        <MdWarningAmber className="text-icon text-xl my-2 mr-2" />
                        <p>{t('One Time Task')}</p>
                    </span>
                    {markedToDelete ? <p className="underline text-error">{t('And Marked to Delete')}</p> : null}
                </>
            )}
            <div className={`${expanded ? "line-clamp-none" : "line-clamp-2"} leading-tight my-1`}>
                <p className="text-description">{description}</p>
            </div>

            <div className={`${expanded && categories !== undefined && Object.entries(categories)?.length > 0 ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-lg text-secondary">{t('Categories')}:</h4>
                <div className="flex flex-col">
                    {/* {categories?.map((category, index) => (
                    <CategoryNameAndIcon key={index}
                    name={category.name} iconId={category.iconId}/>
                    ))} */}
                    {Object.entries(categories!).map(([categoryId, {name, iconId}], index) => (
                        <span className="flex items-center" key={`${categoryId}-${index}`}>
                        <CategoryNameAndIcon
                            name={name} iconId={iconId} />
                        <p className={`${index === Object.entries(categories!).length - 1 ? "invisible" : "mr-1 text-secondary"}`}>,</p>
                        </span>
                    ))}
                </div>
            </div>

            <div className={`${expanded ? "flex flex-col" : "hidden"}`}>
                <h4 className="font-semibold text-lg text-secondary">{t('UsingIn')}:</h4>
                <ul className="ml-6 text-description">
                    <li className="list-disc">Study Routine</li>
                    <li className="list-disc">Morning Routine</li>
                </ul>
            </div>

            <div className={`${expanded && dificulty && importance ? "" : "hidden"} justify-evenly items-start`}>
                <div className="flex items-center justify-evenly">
                    <div className="flex flex-col items-center">
                        <div className={`w-[35px] h-[35px] rounded-full mr-1`} style={{backgroundColor: `${dificultyColor}` }}></div>
                        <p className="text-description">{dificultyPhrase}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`w-[35px] h-[35px] rounded-full mr-1`} style={{backgroundColor: `${importanceColor}` }}></div>
                        <p className="text-description">{importancePhrase}</p>
                    </div>
                </div>
            </div>
            <div className={`${expanded ? "flex flex-col my-2" : "hidden"} items-center justify-center`}>
            <button onClick={handleEditMode}
            className="mb-2 w-[100px] h-[28px] rounded-md bg-primary text-background dark:text-secondary font-semibold hover:bg-primary/90 transition-colors duration-200">
                {t('Edit')}
            </button>
            <button onClick={() => setOnDelete(true)}
            className="w-[90px] h-[25px] rounded-md bg-error hover:bg-error/90 text-background dark:text-secondary font-semibold transition-colors duration-200">
                {t('Delete')}
            </button>

            <DeleteModal
            objectId={id}
            onDelete={onDelete}
            setOnDelete={setOnDelete}
            t={t}
            name={name}
            setObjects={setTasks}
            deleteObject={deleteTask}
            getObjects={getTasks}
            deletePhrase={t('ConfirmDeleteOfTaskPhrase')}
            mode="task"
            />
            </div>
        </div>
    )
}

export default TaskBox;
