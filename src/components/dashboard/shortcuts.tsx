import { Link } from "react-router-dom";
import categoriesIcon from "../../assets/dashboard/shortcuts/categories.svg";
import habitsIcon from "../../assets/dashboard/shortcuts/habits.svg";
import tasksIcon from "../../assets/dashboard/shortcuts/taskIcon.svg";
import routineIcon from "../../assets/dashboard/shortcuts/routineIcon.svg";
import goalsIcon from "../../assets/dashboard/shortcuts/goalsIcon.svg";
import configIcon from "../../assets/dashboard/shortcuts/configIcon.svg";
import { useTranslation } from "react-i18next";

function Shortcuts(){
    const {t} = useTranslation();
    const linkStyle = "flex border-solid border-[1px] border-blueMain p-3 mt-5 rounded-md text-xl font-semibold hover:bg-blueMain hover:text-white transition-all duration-300 ease-in-out transform hover:scale-105 min-w-[168px]"

    return(
        <div className="mt-6">
            <h2 className="text-center text-3xl font-semibold lg:hidden">{t('Shortcuts')}</h2>

            <nav className="flex flex-wrap lg:flex-col justify-between items-start m-4">
                <Link to={"/categories"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={categoriesIcon}
                    alt={t('CategoriesImgAlt')}/>                   
                    {t('Categories')}
                </Link>
                <Link to={"/habits"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={habitsIcon}
                    alt={t('HabitImgAlt')}/>                   
                    {t('Habits')}
                </Link>
                <Link to={"/tasks"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={tasksIcon}
                    alt={t('Tasks icon alt')}/>                   
                    {t('Tasks')}
                </Link>
                <Link to={"/routines"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={routineIcon}
                    alt={t('Routines icon alt')}/>                   
                    {t('Routines')}
                </Link>
                <Link to={"/goals"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={goalsIcon}
                    alt={t('Routines icon alt')}/>                   
                    {t('Goals')}
                </Link>
                <Link to={"/configuration"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={configIcon}
                    alt={t('Routines icon alt')}/>                   
                    {t('Config')}
                </Link>
            </nav>
        </div>
    )
}

export default Shortcuts;