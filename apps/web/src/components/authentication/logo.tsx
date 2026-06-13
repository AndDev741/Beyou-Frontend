import { useTranslation } from "react-i18next"
import LogoIcon from '../../assets/authentication/Logo.png';
import ThemeSelectorInline from "./ThemeSelectorInline";
function Logo(){
    const {t} = useTranslation();
    return(
        <>
        <img className="w-[300px] h-[]"
        src={LogoIcon}
        alt={t('LogoAlt')}/>
        <h2 className="text-5xl font-bold text-white">{t('BeYou')}</h2>
        <h3 className="text-3xl font-medium text-white mt-3">{t('YourFavoriteHT')}</h3>
        <div className="flex flex-col items-center justify-between gap-4 px-6 pt-6">
            <ThemeSelectorInline />
        </div>
        </>
    )
}

export default Logo;