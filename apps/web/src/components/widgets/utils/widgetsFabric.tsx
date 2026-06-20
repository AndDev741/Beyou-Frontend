import BetterArea, { betterAreaProps } from "../betterArea";
import CategoryBalance, { categoryBalanceProps } from "../categoryBalance";
import Constance, { constanceProps } from "../constance";
import DailyProgress, { dailyProgressProps } from "../dailyProgress";
import FastTips from "../fastTips";
import WorstArea, { worstAreaProps } from "../worstArea";
import LevelProgress, { levelProgressProps } from "../levelProgress";
import { WIDGET_IDS } from "@beyou/state";

export const widgetsIds: string[] = [...WIDGET_IDS];

export type WidgetProps = {
    betterArea: betterAreaProps;
    categoryBalance: categoryBalanceProps;
    constance: constanceProps;
    dailyProgress: dailyProgressProps;
    fastTips: {};
    worstArea: worstAreaProps;
    levelProgress: levelProgressProps;
}

const widgetMap = {
    betterArea: BetterArea,
    categoryBalance: CategoryBalance,
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
