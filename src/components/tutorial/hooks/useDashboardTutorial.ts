import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTutorialPhaseState } from "./useTutorialPhaseState";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import {
    getConfigDashboardSteps,
    getDashboardSteps,
    getHabitsDashboardSteps,
    getRoutineSummarySteps,
    getRoutinesDashboardSteps
} from "../steps/dashboardSteps";

export const useDashboardTutorial = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { tutorialPhase, setPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState();

    useEffect(() => {
        if (tutorialPhase === "intro") {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [tutorialPhase]);

    const completeTutorial = useCallback(async () => {
        const success = await finishTutorial({ dispatch, t });
        if (success) {
            clearPhase();
        }
    }, [dispatch, t, clearPhase]);

    const startDashboardSpotlight = useCallback(() => {
        setPhase("dashboard");
    }, [setPhase]);

    const completeDashboardSpotlight = useCallback(() => {
        setPhase("categories");
        navigate("/categories");
    }, [setPhase, navigate]);

    const completeHabitsDashboardSpotlight = useCallback(() => {
        setPhase("habits");
        navigate("/habits");
    }, [setPhase, navigate]);

    const completeRoutinesDashboardSpotlight = useCallback(() => {
        setPhase("routines");
        navigate("/routines");
    }, [setPhase, navigate]);

    const completeRoutineSummarySpotlight = useCallback(() => {
        setPhase("config-dashboard");
    }, [setPhase]);

    const completeConfigDashboardSpotlight = useCallback(() => {
        setPhase("config");
        navigate("/configuration");
    }, [setPhase, navigate]);

    const dashboardSteps = useMemo(() => getDashboardSteps(), []);
    const habitsDashboardSteps = useMemo(() => getHabitsDashboardSteps(), []);
    const routinesDashboardSteps = useMemo(() => getRoutinesDashboardSteps(), []);
    const routineSummarySteps = useMemo(() => getRoutineSummarySteps(), []);
    const configDashboardSteps = useMemo(() => getConfigDashboardSteps(), []);

    const showIntroModal = tutorialPhase === "intro";
    const showDashboardSpotlight = tutorialPhase === "dashboard";
    const showHabitsDashboardSpotlight =
        tutorialPhase === "habits-dashboard" || tutorialPhase === "habits";
    const showRoutinesDashboardSpotlight =
        tutorialPhase === "routines-dashboard" || tutorialPhase === "routines";
    const showRoutineSummarySpotlight = tutorialPhase === "routines-summary";
    const showConfigDashboardSpotlight = tutorialPhase === "config-dashboard";

    return {
        isTutorialCompleted,
        showIntroModal,
        showDashboardSpotlight,
        showHabitsDashboardSpotlight,
        showRoutinesDashboardSpotlight,
        showRoutineSummarySpotlight,
        showConfigDashboardSpotlight,
        dashboardSteps,
        habitsDashboardSteps,
        routinesDashboardSteps,
        routineSummarySteps,
        configDashboardSteps,
        startDashboardSpotlight,
        completeDashboardSpotlight,
        completeHabitsDashboardSpotlight,
        completeRoutinesDashboardSpotlight,
        completeRoutineSummarySpotlight,
        completeConfigDashboardSpotlight,
        completeTutorial
    };
};
