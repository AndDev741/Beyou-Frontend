import { Link } from "react-router-dom";
import categoriesIcon from "../../assets/dashboard/shortcuts/categories.svg";
import { CiFolderOn } from "react-icons/ci";
import habitsIcon from "../../assets/dashboard/shortcuts/habits.svg";
import { CiMountain1 } from "react-icons/ci";
import tasksIcon from "../../assets/dashboard/shortcuts/taskIcon.svg";
import { CiSquareCheck } from "react-icons/ci";
import routineIcon from "../../assets/dashboard/shortcuts/routineIcon.svg";
import { CiMemoPad } from "react-icons/ci";
import goalsIcon from "../../assets/dashboard/shortcuts/goalsIcon.svg";
import { CiMedal } from "react-icons/ci";
import configIcon from "../../assets/dashboard/shortcuts/configIcon.svg";
import { CiSettings } from "react-icons/ci";
import { useTranslation } from "react-i18next";

function Shortcuts() {
    const { t } = useTranslation();
    const linkStyle = "flex items-center border-solid border-[1px] border-primary p-3 mt-5 rounded-md text-xl text-secondary font-semibold bg-background hover:bg-primary hover:text-secondary transition-all duration-300 ease-in-out transform hover:scale-105 min-w-[168px]"

    return (
        <div className="mt-6 lg:mt-2">
            <h2 className="text-center text-3xl font-semibold lg:hidden text-secondary">{t('Shortcuts')}</h2>

            <nav className="flex flex-wrap lg:flex-col justify-between items-start m-4">
                <Link to={"/categories"}
                    className={linkStyle}>
                    <CiFolderOn className="text-[25px] mr-2 text-icon" />
                    {t('Categories')}
                </Link>
                <Link to={"/habits"}
                    className={linkStyle}>
                    <CiMountain1 className="text-[25px] mr-2 text-icon" />
                    {t('Habits')}
                </Link>
                <Link to={"/tasks"}
                    className={linkStyle}>

                    <CiSquareCheck className="text-[25px] mr-2 text-icon" />

                    {t('Tasks')}
                </Link>
                <Link to={"/routines"}
                    className={linkStyle}>
                    <CiMemoPad className="text-[25px] mr-2 text-icon" />
                    {t('Routines')}
                </Link>
                <Link to={"/goals"}
                    className={linkStyle}>
                    <CiMedal className="text-[25px] mr-2 text-icon" />
                    {t('Goals')}
                </Link>
                <Link to={"/configuration"}
                    className={linkStyle}>
                    <CiSettings className="text-[25px] mr-2 text-icon" />

                    {t('Config')}
                </Link>
            </nav>
        </div>
    )
}

export default Shortcuts;