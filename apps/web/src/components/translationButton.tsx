import { useTranslation } from "react-i18next";
import useChangeLanguage from "../hooks/useChangeLanguage";
import { useState } from "react";

function TranslationButton({updateUser}: {updateUser?: boolean}){
    const {i18n} = useTranslation();
    const [lng, setLng] = useState(i18n.language);
    
    useChangeLanguage(lng, updateUser);

    return(
        <div className="flex items-center justify-center w-[100px] cursor-pointer">
            <button
            onClick={() => setLng("en")}
            className={`border-solid border-2 border-border p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "en" ? "bg-accent text-white" : "text-text hover:bg-accent/10"}`}>
                EN
            </button>
            <button
             onClick={() => setLng("pt")}
             className={`border-solid border-2 border-border p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "pt" || i18n.language === "pt-BR" ? "bg-accent text-white" : "text-text hover:bg-accent/10"}`}>
                PT
            </button>
        </div>
    )
}

export default TranslationButton;
