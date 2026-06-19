import { useEffect } from "react";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { useDispatch, useStore } from "react-redux";
import { logger } from "../utils/logger";
import { RootState } from "@beyou/state/rootReducer";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";

// Re-exported for back-compat with any consumer importing it from this module.
export { STREAK_MILESTONES } from "@beyou/state/gamification/streakMilestones";

type UiRefreshOptions = { skipCelebrations?: boolean };

export default function useUiRefresh(refreshUi: RefreshUI, options: UiRefreshOptions = {}) {
    logger.log("Refreshing Objects => ", refreshUi);
    const dispatch = useDispatch();
    const store = useStore();

    useEffect(() => {
        const previous = (store.getState() as RootState).perfil;
        applyRefreshUi(refreshUi, dispatch, previous, options);
    }, [refreshUi]);
}
