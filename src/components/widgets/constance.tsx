import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"

export type constanceProps = {
    constance: number;
}

export default function Constance({constance}: constanceProps){
    const {t} = useTranslation();
    return (
        <BaseDiv title={t('Constance')} >
            <p className="text-lg text-lg font-semibold text-primary">{constance}</p>
            <p className="text-primary text-lg font-semibold text-secondary">{t('Days')}</p>
        </BaseDiv>
    )
}