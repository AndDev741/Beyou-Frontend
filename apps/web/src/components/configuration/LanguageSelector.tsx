import { useTranslation } from "react-i18next"
import TranslationButton from "../translationButton";

export default function LanguageSelector() {
    const {t} = useTranslation();
    return (
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t('Language')}</h3>
            <TranslationButton updateUser={true}/>
            <a href="https://github.com/AndDev741/Beyou-Frontend/tree/main/src/translations"
            target="_blank"
            className="mt-1.5 block text-[11px] text-text-3 underline">
                {t('Help translate phrase')}
            </a>
        </div>
    )
}
