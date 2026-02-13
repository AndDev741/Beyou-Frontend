import type { TFunction } from "i18next";
import { toast } from "react-toastify";
import editUser from "../../../services/user/editUser";
import { getFriendlyErrorMessage } from "../../../services/apiError";
import { tutorialCompletedEnter } from "../../../redux/user/perfilSlice";
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
    dispatch(tutorialCompletedEnter(true));
    clearTutorialPhase();
    return true;
};
