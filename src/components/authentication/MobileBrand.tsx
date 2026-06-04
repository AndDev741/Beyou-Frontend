import { useTranslation } from "react-i18next";
import LogoIcon from '../../assets/authentication/Logo.png';

export default function MobileBrand() {
    const { t } = useTranslation();
    return (
        <div className="flex lg:hidden flex-col items-center pt-6 pb-2" data-testid="mobile-brand">
            <img className="w-[90px]" src={LogoIcon} alt={t("LogoAlt")} />
            <h1 className="text-3xl font-bold text-primary mt-1">{t("BeYou")}</h1>
            <p className="text-sm text-description mt-1">{t("YourFavoriteHT")}</p>
        </div>
    );
}
