import { useTranslation } from "react-i18next";
import BrandMark from "../brand/BrandMark";

export default function MobileBrand() {
    const { t } = useTranslation();
    return (
        <div className="flex lg:hidden flex-col items-center pt-6 pb-2" data-testid="mobile-brand">
            <BrandMark size={40} withWordmark className="text-accent" />
            <p className="mt-2 text-sm text-text-2">{t("YourFavoriteHT")}</p>
        </div>
    );
}
