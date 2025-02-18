import { useTranslation } from "react-i18next";
function TranslationButton(){
    const {i18n} = useTranslation();
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    }
    return(
        <div className="flex items-center justify-center w-[100px] cursor-pointer">
            <button onClick={() => changeLanguage("en")}
            className={`${i18n.language === "en" ? "text-white bg-blueMain" : "hover:bg-gray-100"} border-solid border-2 border-blueMain p-3 lg:p-2 font-bold text-2xl`}>
                EN
            </button>
            <button onClick={() => changeLanguage("pt")}
             className={`${i18n.language === "pt" || i18n.language === "pt-BR" ? "text-white bg-blueMain" : "hover:bg-gray-100"} border-solid border-2 border-blueMain p-3 lg:p-2 font-bold text-2xl`}>
                PT
            </button>
        </div>
    )
}

export default TranslationButton;