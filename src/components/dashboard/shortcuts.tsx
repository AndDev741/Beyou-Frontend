import { Link } from "react-router-dom";
import { CiFolderOn } from "react-icons/ci";
import { CiMountain1 } from "react-icons/ci";
import { CiSquareCheck } from "react-icons/ci";
import { CiMemoPad } from "react-icons/ci";
import { CiMedal } from "react-icons/ci";
import { CiSettings } from "react-icons/ci";
import { useTranslation } from "react-i18next";

function Shortcuts() {
    const { t } = useTranslation();
    const linkStyle = "flex items-center border-solid border-[1px] border-primary p-3 mt-5 mx-1 md:mx-0 rounded-md text-xl text-secondary font-semibold bg-background hover:bg-primary hover:text-secondary transition-all duration-300 ease-in-out transform hover:scale-105 min-w-[168px]"

    return (
        <div className="mt-6 lg:mt-2">
            <h2 className="text-center text-3xl font-semibold lg:hidden text-secondary">{t('Shortcuts')}</h2>

            <nav className="flex flex-wrap lg:flex-col justify-center md:justify-center items-start md:gap-3 lg:gap-0 lg:m-4">
                <Link to={"/categories"}
                    data-tutorial-id="shortcut-categories"
                    className={linkStyle}>
                    <CiFolderOn className="text-[25px] mr-2 text-icon" />
                    {t('Categories')}
                </Link>
                <Link to={"/habits"}
                    data-tutorial-id="shortcut-habits"
                    className={linkStyle}>
                    <CiMountain1 className="text-[25px] mr-2 text-icon" />
                    {t('Habits')}
                </Link>
                <Link to={"/tasks"}
                    data-tutorial-id="shortcut-tasks"
                    className={linkStyle}>

                    <CiSquareCheck className="text-[25px] mr-2 text-icon" />

                    {t('Tasks')}
                </Link>
                <Link to={"/routines"}
                    data-tutorial-id="shortcut-routines"
                    className={linkStyle}>
                    <CiMemoPad className="text-[25px] mr-2 text-icon" />
                    {t('Routines')}
                </Link>
                <Link to={"/goals"}
                    data-tutorial-id="shortcut-goals"
                    className={linkStyle}>
                    <CiMedal className="text-[25px] mr-2 text-icon" />
                    {t('Goals')}
                </Link>
                <Link to={"/configuration"}
                    data-tutorial-id="shortcut-configuration"
                    className={linkStyle}>
                    <CiSettings className="text-[25px] mr-2 text-icon" />

                    {t('Config')}
                </Link>
            </nav>
        </div>
    )
}

export default Shortcuts;
