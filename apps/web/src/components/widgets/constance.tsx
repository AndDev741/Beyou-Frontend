import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"

export type constanceProps = {
    constance: number;
}

export default function Constance({constance}: constanceProps){
    const {t} = useTranslation();
    return (
        <BaseDiv title={t('Constance')} >
            <p className="text-lg text-lg font-semibold text-accent">{constance}</p>
            <p className="text-accent text-lg font-semibold text-text">{t('Days', { count: constance })}</p>
        </BaseDiv>
    )
}