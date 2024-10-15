import { Link } from "react-router-dom";
import categoriesIcon from "../../assets/dashboard/shortcuts/categories.svg"
import { useTranslation } from "react-i18next";

function Shortcuts(){
    const {t} = useTranslation();
    const linkStyle = "flex border-solid border-[1px] border-blueMain p-3 mt-5 rounded-md text-xl font-semibold hover:bg-blueMain hover:text-white transition-all duration-300 ease-in-out transform hover:scale-105"


    return(
        <div className="mt-6">
            <h2 className="text-center text-3xl font-semibold lg:hidden">{t('Shortcuts')}</h2>

            <nav className="flex flex-wrap lg:flex-col justify-evenly items-start m-4">
                <Link to={"/categories"}
                className={linkStyle}>
                    <img className="w-[30px] mr-2" 
                    src={categoriesIcon}
                    alt={t('CategoriesImgAlt')}/>                   
                    {t('Categories')}
                </Link>
            </nav>
        </div>
    )
}

export default Shortcuts;