import { useEffect, useState } from "react"
import { useDispatch } from "react-redux";
import {editModeEnter ,idEnter, nameEnter, descriptionEnter, iconEnter} from '../../redux/category/editCategorySlice'
import iconSearch from "./icons/iconsSearch"
import increaseIcon from '../../assets/categories/increaseIcon.svg';
import decreaseIcon from '../../assets/categories/decreaseIcon.svg';

function CategoryBox({id, iconName, name, description, level, xp, nextLevelXp}){
    const dispatch = useDispatch();
    const [icon, setIcon]= useState(null);
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const response = iconSearch(iconName);
        setIcon(response[0]);
    }, []);

    const handleEdit = () => {
        dispatch(editModeEnter(true));
        dispatch(idEnter(id));
        dispatch(nameEnter(name));
        dispatch(descriptionEnter(description));
        dispatch(iconEnter(iconName));
    }

    return(
        <div className={`flex flex-col justify-between border-[1px] border-blueMain rounded-md mb-5 w-[46vw] md:w-[300px] lg:w-[230px] transition-all duration-500 ease-in-out p-1 break-words
        ${expanded ? "min-h-[300px]" : "h-[150px]"} 
        transform ${expanded ? "lg:scale-105 lg:mx-2" : "scale-100"}
        `}>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <p className="text-[35px] text-blueMain">
                        {icon !== null ? <icon.IconComponent/> : ""}
                    </p>
                    <h3 className={`text-lg md:text-xl font-semibold ml-1 max-w-[26vw] md:max-w-[220px] lg:max-w-[150px] ${expanded ? "line-clamp-none" : " line-clamp-1"}`}>{name}</h3>
                </div>
                <img onClick={() => setExpanded(!expanded)}
                className="w-[25px] pb-3 cursor-pointer hover:scale-105"
                src={expanded ? decreaseIcon : increaseIcon}/>
            </div>

            <p className={`text-[15px] leading-tight  ${expanded ? "line-clamp-none my-2" : "line-clamp-2"}`}>{description}</p>

            <div className={`${expanded ? "block my-2" : "hidden"}`}>
                <h2 className="text-lg font-semibold">Using in:</h2>
                <ul>
                    <li className="ml-6 list-disc">Habit: SomeHabit</li>
                    <li className="ml-6 list-disc">Task: SomeTask</li>
                    <li className="ml-6 list-disc">Goal: Some Goal</li>
                </ul>
            </div>

            <div className="flex flex-col mb-1">
                <div className="flex justify-between">
                    <p>Level {level}</p>
                    <p><span className="text-blueMain">{xp}</span>/{nextLevelXp}</p>
                </div>
                <div className="flex w-[100%]">
                    <div className={`border-[1px] w-[20%] border-darkBlue bg-blueMain h-[15px] rounded-l-xl`}></div>
                    <div className={`border-[1px] w-[80%] border-darkBlue bg-ligthGray h-[15px] rounded-r-xl`}></div>
                </div>
            </div>

            <div className={`${expanded ? "flex my-2" : "hidden"} items-center justify-center`}>
                <button onClick={handleEdit}
                className="bg-blueMain hover:bg-ligthBlue text-white font-semibold w-[100px] h-[28px] rounded-md">
                    Edit
                </button>
            </div>
        </div>
    )
}

export default CategoryBox;