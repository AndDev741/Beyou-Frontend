import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"

type constanceProps = {
    constance: number
}

export default function Constance({constance}: constanceProps){
    const {t} = useTranslation();
    return (
        <BaseDiv title={t('Constance')} >
            <p className="text-lg text-lg font-semibold">{constance}</p>
            <p className="text-blueMain text-lg font-semibold">{t('Days')}</p>
        </BaseDiv>
    )
}