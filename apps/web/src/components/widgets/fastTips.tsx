import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"
import { Lightbulb } from "lucide-react"
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

    const index = getDayOfYear(new Date()) % tips.length;

    return (
        <BaseDiv title={t('Fast Tips')} icon={<Lightbulb size={14.5} aria-hidden="true" />}>
            <div className="mt-3 flex items-start gap-2.5">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-xp-soft text-xp">
                    <Lightbulb size={15} aria-hidden="true" />
                </span>
                <p className="text-[12.5px] leading-snug text-text-2" data-testid="fast-tip">
                    {t(tip.phrase)}
                </p>
            </div>

            <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] text-text-3">
                <span>{t("TipCounter", { index: index + 1, total: tips.length })}</span>
                {url && tip.phraseURL ? (
                    <a
                        href={url}
                        className="font-semibold text-accent hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t(tip.phraseURL)}
                    </a>
                ) : (
                    <span>{t("ChangesDaily")}</span>
                )}
            </div>
        </BaseDiv>
    )
}
