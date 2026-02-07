import { Link } from "react-router-dom";
import returnPageIcon from "../assets/returnPage.svg";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { CgLogOut } from "react-icons/cg";
import logoutRequest from "../services/authentication/request/logoutRequest";
import { toast } from "react-toastify";

function Header({pageName, showLogout}: {pageName: string, showLogout?: boolean}) {
    const {t} = useTranslation();

    const onLogout = async () => {
        const successLogout = await logoutRequest();
        if (successLogout) {
            window.location.href = "/";
        } else {
            toast.error(t('ErrorLogout'), {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        }
    }
    
    return(
        <header className="flex items-center justify-between w-[100%] h-[60px] bg-primary px-3 
        text-background dark:text-secondary text-2xl font-semibold transition-colors duration-200">
            <h1>{t(`${pageName}`)}</h1>


        <div className="flex items-center gap-4">
            {showLogout && (
                <Button 
                text={t('Logout')} 
                size="medium" 
                mode="default" 
                type="button"
                onClick={onLogout}
                icon={<CgLogOut size={24} />}
                />
            )}

            <Link to={"/dashboard"}>
                <img className="w-[45px] duration-300 ease-in-out transform hover:scale-105"
                alt={t('ReturnPageAlt')}
                src={returnPageIcon}/>
            </Link>
        </div>
            
        </header>
    )
}

export default Header;
