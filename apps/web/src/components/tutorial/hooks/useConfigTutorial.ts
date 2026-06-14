import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import { useTutorialPhaseState } from "./useTutorialPhaseState";

export const useConfigTutorial = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { tutorialPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState(null);
    const finishingTutorial = useRef(false);

    useEffect(() => {
        if (finishingTutorial.current) return;
        if (isTutorialCompleted) {
            clearPhase();
            return;
        }
        if (tutorialPhase !== "config") return;
        finishingTutorial.current = true;

        const run = async () => {
            const success = await finishTutorial({ dispatch, t });
            if (!success) {
                finishingTutorial.current = false;
            } else {
                clearPhase();
            }
        };

        run();
    }, [dispatch, t, tutorialPhase, isTutorialCompleted, clearPhase]);
};
