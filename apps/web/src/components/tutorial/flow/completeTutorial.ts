import type { TFunction } from "i18next";
import { toast } from "react-toastify";
import editUser from "@beyou/api/user/editUser";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { ANALYTICS_EVENTS, getAnalytics } from "@beyou/api";
import { tutorialCompletedEnter } from "@beyou/state/user/perfilSlice";
import { clearTutorialPhase } from "../tutorialStorage";
import type { AppDispatch } from "../../../redux/store";

type CompleteTutorialParams = {
    dispatch: AppDispatch;
    t: TFunction;
};

export const completeTutorial = async ({ dispatch, t }: CompleteTutorialParams) => {
    const response = await editUser({ isTutorialCompleted: true });
    if (response.error) {
        const message = getFriendlyErrorMessage(t, response.error);
        toast.error(message);
        return false;
    }
    // After the write, not before: the flag is the activation line, and an account whose
    // save failed has not crossed it. Lives here rather than in `editUser`, because
    // `editUser` is also how the config screen switches the tutorial back OFF, and a
    // "completed" event fired on a reset would poison the funnel. The tutorial is a web
    // flow today; when mobile gains one, it belongs at the same point in its own path.
    getAnalytics().track(ANALYTICS_EVENTS.TUTORIAL_COMPLETED);
    dispatch(tutorialCompletedEnter(true));
    clearTutorialPhase();
    return true;
};
