import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useTutorialPhaseState } from "./useTutorialPhaseState";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import { useIsMobile } from "../utils/useIsMobile";
import { getHabitSteps } from "../steps/habitsSteps";

type UseHabitsTutorialOptions = {
    hasHabits: boolean;
};

export const useHabitsTutorial = ({ hasHabits }: UseHabitsTutorialOptions) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [habitStep, setHabitStep] = useState(0);
    const { tutorialPhase, setPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState();

    useEffect(() => {
        if (tutorialPhase === "habits-dashboard") {
            setPhase("habits");
        }
    }, [tutorialPhase, setPhase]);

    useEffect(() => {
        if (tutorialPhase !== "habits") return;
        setHabitStep(hasHabits ? 1 : 0);
    }, [tutorialPhase, hasHabits]);

    const completeTutorial = useCallback(async () => {
        const success = await finishTutorial({ dispatch, t });
        if (success) {
            clearPhase();
        }
    }, [dispatch, t, clearPhase]);

    const advanceToRoutinesFlow = useCallback(() => {
        setPhase("routines-dashboard");
    }, [setPhase]);

    const habitSteps = useMemo(
        () => getHabitSteps({ isMobile, hasHabits }),
        [isMobile, hasHabits]
    );

    const showHabitSpotlight = !isTutorialCompleted && tutorialPhase === "habits";

    return {
        habitSteps,
        habitStep,
        setHabitStep,
        showHabitSpotlight,
        onComplete: advanceToRoutinesFlow,
        onSkip: completeTutorial
    };
};
