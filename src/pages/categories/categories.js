import { Link } from "react-router-dom";
import returnPageIcon from "../../assets/returnPage.svg"
import CreateCategory from "../../components/categories/createCategory";
import VerifyAuth from "../../components/verifyAuthentication";
import { useTranslation } from "react-i18next";

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
            <main>
                <CreateCategory />
            </main>
        </>
    )
}

export default Categories;