import { Link } from "react-router-dom";
import returnPageIcon from "../assets/returnPage.svg";
import { useTranslation } from "react-i18next";

function Header({pageName}: {pageName: string}) {
    const {t} = useTranslation();
    
    return(
        <header className="flex items-center justify-between w-[100%] h-[60px] bg-primary px-3 
        text-background dark:text-secondary text-2xl font-semibold transition-colors duration-200">
            <h1>{t(`${pageName}`)}</h1>
            <Link to={"/dashboard"}>
                <img className="w-[45px] duration-300 ease-in-out transform hover:scale-105"
                alt={t('ReturnPageAlt')}
                src={returnPageIcon}/>
            </Link>
        </header>
    )
}

export default Header;
