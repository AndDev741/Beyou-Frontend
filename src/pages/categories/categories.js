import { Link } from "react-router-dom";
import returnPageIcon from "../../assets/returnPage.svg"
import CreateCategory from "../../components/categories/createCategory";
import VerifyAuth from "../../components/verifyAuthentication";
import { useTranslation } from "react-i18next";
import RenderCategories from "../../components/categories/renderCategories";

function Categories(){
    const {t} = useTranslation();
    return(
        <>
        <VerifyAuth />
            <header className="flex items-center justify-between w-[100%] h-[60px] bg-blueMain px-3 
            text-white text-2xl font-semibold">
                <h1>{t('YourCategories')}</h1>
                <Link to={"/dashboard"}>
                    <img className="w-[45px] duration-300 ease-in-out transform hover:scale-105"
                    alt={t('ReturnPageAlt')}
                    src={returnPageIcon}/>
                </Link>
            </header>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start mb-4 lg:mb-0 mt-4">
                <div className="w-[100%] lg:w-[58%]">
                    <RenderCategories />
                </div>
                <div className="lg:flex lg:justify- w-[100%] lg:w-[42%]">
                    <CreateCategory />
                </div>
            </main>
        </>
    )
}

export default Categories;