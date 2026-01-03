import BetterArea, { betterAreaProps } from "../betterArea";
import Constance, { constanceProps } from "../constance";
import DailyProgress, { dailyProgressProps } from "../dailyProgress";
import FastTips from "../fastTips";
import WorstArea, { worstAreaProps } from "../worstArea";
import LevelProgress, { levelProgressProps } from "../levelProgress";

export const widgetsIds = ["worstArea", "constance", "betterArea", "dailyProgress", "fastTips", "levelProgress"];

export type WidgetProps = {
    betterArea: betterAreaProps;
    constance: constanceProps;
    dailyProgress: dailyProgressProps;
    fastTips: {};
    worstArea: worstAreaProps;
    levelProgress: levelProgressProps;
}

const widgetMap = {
    betterArea: BetterArea,
    constance: Constance,
    dailyProgress: DailyProgress,
    fastTips: FastTips,
    worstArea: WorstArea,
    levelProgress: LevelProgress,
}

export default function WidgetsFabric<K extends keyof WidgetProps>({
    widgetId,
    draggable,
    ...props
}: {widgetId: K, draggable?: boolean} & WidgetProps[K]){

    const Component = widgetMap[widgetId];
    return <Component {...(props as any)}  />
}
