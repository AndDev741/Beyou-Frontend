import { useEffect } from "react";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { useDispatch, useStore } from "react-redux";
import { actualLevelXpEnter, alreadyIncreaseConstanceTodayEnter, constanceEnter, levelEnter, maxConstanceEnter, nextLevelXpEnter, xpEnter } from "../redux/user/perfilSlice";
import { refreshCategorie } from "../redux/category/categoriesSlice";
import { refreshItemGroup } from "../redux/routine/todayRoutineSlice";
import { logger } from "../utils/logger";
import { celebrationPushed } from "../redux/celebration/celebrationSlice";
import { RootState } from "../redux/rootReducer";

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100];

type UiRefreshOptions = { skipCelebrations?: boolean };

export default function useUiRefresh(refreshUi: RefreshUI, options: UiRefreshOptions = {}) {
    logger.log("Refreshing Objects => ", refreshUi);
    const dispatch = useDispatch();
    const store = useStore();

    useEffect(() => {

        if(refreshUi?.refreshUser){
            const refreshUser = refreshUi.refreshUser;
            const previous = (store.getState() as RootState).perfil;

            if (!options.skipCelebrations && refreshUser.level > previous.level) {
                dispatch(celebrationPushed({ kind: "levelUp", level: refreshUser.level }));
            }

            const milestone = STREAK_MILESTONES.find(
                m => previous.constance < m && refreshUser.currentConstance >= m
            );
            if (!options.skipCelebrations && milestone) {
                dispatch(celebrationPushed({ kind: "streakMilestone", days: milestone }));
            }
            dispatch(xpEnter(refreshUser.xp));
            dispatch(levelEnter(refreshUser.level));
            dispatch(constanceEnter(refreshUser.currentConstance));
            dispatch(maxConstanceEnter(refreshUser.maxConstance));
            dispatch(alreadyIncreaseConstanceTodayEnter(refreshUser.alreadyIncreaseConstanceToday));
            dispatch(nextLevelXpEnter(refreshUser.nextLevelXp));
            dispatch(actualLevelXpEnter(refreshUser.actualLevelXp));
        }

        if(refreshUi?.refreshCategories && refreshUi.refreshCategories.length > 0) {
            refreshUi.refreshCategories.forEach(refreshCat => {
                dispatch(refreshCategorie(refreshCat));
            })
        }

        if(refreshUi?.refreshItemChecked){
            logger.log("REFRESH ITEM CHECKED => ", refreshUi?.refreshItemChecked)
            dispatch(refreshItemGroup(refreshUi?.refreshItemChecked));
        }

    }, [refreshUi]);
}