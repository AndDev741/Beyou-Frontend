import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { clearTutorialPhase, getTutorialPhase, setTutorialPhase, type TutorialPhase } from "../tutorialStorage";
import type { RootState } from "../../../redux/rootReducer";

export const useTutorialPhaseState = (defaultPhase: TutorialPhase | null = "intro") => {
    const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
    const [tutorialPhase, setTutorialPhaseState] = useState<TutorialPhase | null>(() => getTutorialPhase());

    const setPhase = useCallback((phase: TutorialPhase) => {
        setTutorialPhase(phase);
        setTutorialPhaseState(phase);
    }, []);

    const clearPhase = useCallback(() => {
        clearTutorialPhase();
        setTutorialPhaseState(null);
    }, []);

    useEffect(() => {
        if (isTutorialCompleted) {
            clearPhase();
            return;
        }
        if (!tutorialPhase && defaultPhase) {
            setPhase(defaultPhase);
        }
    }, [isTutorialCompleted, tutorialPhase, defaultPhase, setPhase, clearPhase]);

    return {
        tutorialPhase,
        setPhase,
        clearPhase,
        isTutorialCompleted,
        setTutorialPhaseState
    };
};
