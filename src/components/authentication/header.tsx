import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Header(){
    const {t} = useTranslation();
    const location = useLocation();
    const currentPath = location.pathname;
    return(
        <header className="bg-background">
            <nav className="flex justify-evenly py-8 lg:my-7 lg:py-0 text-3xl">
                <Link
                to={"/"}
                className={`transition-colors duration-200 ${currentPath === "/" ? "text-primary font-medium" : "text-secondary"}`}>
                    {t('Login')}
                </Link>

                <Link
                to={"/register"}
                className={`transition-colors duration-200 ${currentPath === "/register" ? "text-primary font-medium" : "text-secondary"}`}>
                    {t('Register')}
                </Link>
            </nav>
            {/* Border */}
            <div className={`${currentPath === "/register" ? "flex items-end justify-end" : ""}`}>
                <div className={`border-b-2 border-solid border-primary 
                ${currentPath === "/" ? "w-[50%]" : ""} 
                ${currentPath === "/register" ? "w-[50%]" : ""}`}></div>
            </div>
        </header>
    )
}

export default Header;
