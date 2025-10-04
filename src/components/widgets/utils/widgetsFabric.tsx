import BetterArea, { betterAreaProps } from "../betterArea";
import Constance, { constanceProps } from "../constance";
import DailyProgress, { dailyProgressProps } from "../dailyProgress";
import FastTips from "../fastTips";
import WorstArea, { worstAreaProps } from "../worstArea";

export const widgetsIds = ["worstArea", "constance", "betterArea", "dailyProgress", "fastTips"];

export type WidgetProps = {
    betterArea: betterAreaProps;
    constance: constanceProps;
    dailyProgress: dailyProgressProps;
    fastTips: {};
    worstArea: worstAreaProps
}

const widgetMap = {
    betterArea: BetterArea,
    constance: Constance,
    dailyProgress: DailyProgress,
    fastTips: FastTips,
    worstArea: WorstArea
}

export default function WidgetsFabric<K extends keyof WidgetProps>({
    widgetId,
    draggable,
    ...props
}: {widgetId: K, draggable?: boolean} & WidgetProps[K]){

    const Component = widgetMap[widgetId];
    return <Component {...(props as any)} draggable={draggable} />
}