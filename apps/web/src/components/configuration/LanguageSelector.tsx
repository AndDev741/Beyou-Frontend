import { useTranslation } from "react-i18next"
import TranslationButton from "../translationButton";

export default function LanguageSelector() {
    const {t} = useTranslation();
    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-surface text-text transition-colors duration-200 rounded-control shadow-sm">
            <h1 className="text-base font-semibold mb-4">{t('Language')}</h1>
            <div className="flex flex-col items-center justify-center w-full">
                <TranslationButton updateUser={true}/>
                <a href="https://github.com/AndDev741/Beyou-Frontend/tree/main/src/translations"
                target="_blank"
                className="text-text-2 underline cursor-pointer mt-1">
                    {t('Help translate phrase')}
                </a>
            </div>
        </div>
    )
}