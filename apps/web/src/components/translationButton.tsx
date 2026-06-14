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
            className={`border-solid border-2 border-primary p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "en" ? "bg-primary text-white" : "text-secondary hover:bg-primary/10"}`}>
                EN
            </button>
            <button
             onClick={() => setLng("pt")}
             className={`border-solid border-2 border-primary p-3 lg:p-2 font-bold text-2xl transition-colors duration-200 ${i18n.language === "pt" || i18n.language === "pt-BR" ? "bg-primary text-white" : "text-secondary hover:bg-primary/10"}`}>
                PT
            </button>
        </div>
    )
}

export default TranslationButton;
