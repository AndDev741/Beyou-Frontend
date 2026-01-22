import { useEffect } from "react";
import { RefreshUI } from "../../types/refreshUi/refreshUi.type";
import { useDispatch } from "react-redux";
import { actualLevelXpEnter, alreadyIncreaseConstanceTodayEnter, constanceEnter, maxConstanceEnter, nextLevelXpEnter, xpEnter } from "../../redux/user/perfilSlice";
import { refreshCategorie } from "../../redux/category/categoriesSlice";
import { refreshItemGroup } from "../../redux/routine/todayRoutineSlice";

export default function useUiRefresh(refreshUi: RefreshUI) {
    console.log("Refreshing Objects => ", refreshUi);
    const dispatch = useDispatch();

    useEffect(() => {

        if(refreshUi?.refreshUser){
            const refreshUser = refreshUi.refreshUser;
            dispatch(xpEnter(refreshUser.xp));
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
            console.log("REFRESH ITEM CHECKED => ", refreshUi?.refreshItemChecked)
            dispatch(refreshItemGroup(refreshUi?.refreshItemChecked));
        }

    }, [refreshUi]);
}