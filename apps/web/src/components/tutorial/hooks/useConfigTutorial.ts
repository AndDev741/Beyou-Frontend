import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTutorialPhaseState } from "./useTutorialPhaseState";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import { getConfigSteps } from "../steps/configSteps";

/**
 * Config walkthrough: one spotlight step per settings section. Finishing moves to
 * the 'done' phase and navigates to the dashboard, where the finale message shows.
 * Uses defaultPhase=null so visiting settings normally never starts the tutorial.
 */
export const useConfigTutorial = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [configStep, setConfigStep] = useState(0);
    const { tutorialPhase, setPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState(null);

    useEffect(() => {
        if (tutorialPhase !== "config") return;
        setConfigStep(0);
    }, [tutorialPhase]);

    const onComplete = useCallback(() => {
        setPhase("done");
        navigate("/dashboard");
    }, [setPhase, navigate]);

    const onSkip = useCallback(async () => {
        const success = await finishTutorial({ dispatch, t });
        if (success) clearPhase();
    }, [dispatch, t, clearPhase]);

    const configSteps = useMemo(() => getConfigSteps(), []);

    const showConfigSpotlight = !isTutorialCompleted && tutorialPhase === "config";

    return {
        configSteps,
        configStep,
        setConfigStep,
        showConfigSpotlight,
        onComplete,
        onSkip
    };
};
