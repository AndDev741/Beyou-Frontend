import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/ThemeContext";
import { themes } from "../utils/listOfThemes";
import editUser from "../../services/user/editUser";
import { useDispatch } from "react-redux";
import { themeInUseEnter } from "../../redux/user/perfilSlice";

export default function ThemeSelector(){
    const {t} = useTranslation();
    const { setTheme } = useTheme();
    const dispatch = useDispatch();

    const onSubmit = (theme: typeof themes[0]) => {
        const themeToSave = {
            theme: theme.mode
        };

        editUser(themeToSave);
        dispatch(themeInUseEnter(theme));
        setTheme(theme)
    }

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-background text-secondary transition-colors duration-200 rounded-lg shadow-sm">
            <h1 className="text-2xl font-semibold mb-4">{t('Theme')}</h1>
            <div className="flex items-center justify-evenly w-full flex-wrap">
                {themes.map(theme => (
                    <div className="flex flex-col items-center"
                    key={theme.mode}
                    >
                        <div className={`border-[1px] rounded-full w-[40px] h-[40px] cursor-pointer mx-5 my-1`}
                        style={{background: `linear-gradient(90deg, ${theme.background} 50%, ${theme.primary} 50%)`,
                        borderColor: theme.primary}}
                        onClick={() => onSubmit(theme)}
                        ></div>
                        <p className="text-secondary">{t(theme.mode)}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}