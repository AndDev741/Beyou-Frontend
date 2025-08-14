import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"
import fastTipsData from "./utils/fastTips.json";

export default function FastTips(){
    const {t, i18n} = useTranslation();
    return (
        <BaseDiv title={t('Fast Tips')} bigSize={true} >
            {/* Mobile */}
            <p className="md:hidden text-blueMain font-medium text-center line-clamp-1">{t(fastTipsData.habit.smallPhrase)}</p>
            {/* Desktop */}
            <p className="hidden md:block text-xl text-blueMain font-medium text-center line-clamp-1">{t(fastTipsData.habit.phrase)}</p>
            <a 
                href={i18n.language === 'pt' ? fastTipsData.habit.urlPT : fastTipsData.habit.urlEN} 
                className="text-blueMain underline font-bold text-center md:text-lg"
                target="_blank" 
                rel="noopener noreferrer"
            >
                {t(fastTipsData.habit.phraseURL)}
            </a>
        </BaseDiv>
    )
}