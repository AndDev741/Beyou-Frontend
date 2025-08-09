import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"

type dailyProgressProps = {
    checked: number
    total: number
}

export default function DailyProgress({checked, total}: dailyProgressProps){
    const {t} = useTranslation();
    return (
        <BaseDiv title={t('Daily Progress')} >
            <p className="text-blueMain text-lg text-lg font-semibold">{t('Tasks')}</p>
            <p className="text-blueMain text-lg font-semibold">{checked}/{total}</p>
        </BaseDiv>
    )
}