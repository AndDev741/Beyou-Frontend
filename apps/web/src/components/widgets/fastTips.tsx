import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"
import fastTipsData from "./utils/fastTips.json";

type Tip = {
    phrase: string;
    smallPhrase: string;
    urlEN?: string;
    urlPT?: string;
    phraseURL?: string;
};

const MS_PER_DAY = 86_400_000;

function getDayOfYear(date: Date): number {
    const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfYear = Date.UTC(date.getFullYear(), 0, 1);
    return Math.floor((utc - startOfYear) / MS_PER_DAY);
}

export default function FastTips() {
    const { t, i18n } = useTranslation();
    const tips = fastTipsData.tips as Tip[];
    const tip = tips[getDayOfYear(new Date()) % tips.length];
    const url = i18n.language === 'pt' ? tip.urlPT : tip.urlEN;

    return (
        <BaseDiv title={t('Fast Tips')} bigSize={true}>
            <p className="md:hidden text-primary font-medium text-center line-clamp-2" data-testid="fast-tip">{t(tip.smallPhrase)}</p>
            <p className="hidden md:block text-xl text-primary font-medium text-center line-clamp-2">{t(tip.phrase)}</p>
            {url && tip.phraseURL && (
                <a
                    href={url}
                    className="text-secondary underline font-bold text-center md:text-lg"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {t(tip.phraseURL)}
                </a>
            )}
        </BaseDiv>
    )
}
