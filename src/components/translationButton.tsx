import { useTranslation } from "react-i18next";
function TranslationButton(){
    const {i18n} = useTranslation();
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    }
    return(
        <div className="flex items-center justify-center w-[100px] cursor-pointer">
            <button
            onClick={() => changeLanguage("en")}
            className={`border-solid border-2 border-primary p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "en" ? "bg-primary text-secondary" : "text-secondary hover:bg-primary/10"}`}>
                EN
            </button>
            <button
             onClick={() => changeLanguage("pt")}
             className={`border-solid border-2 border-primary p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "pt" || i18n.language === "pt-BR" ? "bg-primary text-white" : "text-secondary hover:bg-primary/10"}`}>
                PT
            </button>
        </div>
    )
}

export default TranslationButton;
