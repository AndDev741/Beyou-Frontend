import { useTranslation } from "react-i18next"
import BrandMark from "../brand/BrandMark";
import ThemeSelectorInline from "./ThemeSelectorInline";

/** Painel de marca do login (coluna esquerda, só em telas grandes). */
function Logo() {
    const { t } = useTranslation();
    return (
        <>
            <BrandMark size={96} className="text-on-accent" />
            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.02em] text-on-accent">
                {t('LoginBrandHeadline')}
            </h2>
            <h3 className="mt-3 text-lg font-normal text-on-accent/80">{t('YourFavoriteHT')}</h3>
            <div className="flex flex-col items-center justify-between gap-4 px-6 pt-8">
                <ThemeSelectorInline />
            </div>
        </>
    )
}

export default Logo;
