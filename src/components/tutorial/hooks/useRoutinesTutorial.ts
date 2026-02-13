import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTutorialPhaseState } from "./useTutorialPhaseState";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import { useIsMobile } from "../utils/useIsMobile";
import { getRoutineSteps } from "../steps/routinesSteps";

type UseRoutinesTutorialOptions = {
    onCreateRoutine: boolean;
    routineType: string;
    hasDailySection: boolean;
    isSectionModalOpen: boolean;
    isScheduleModalOpen: boolean;
    hasRoutines: boolean;
    hasScheduleToday: boolean;
};

export const useRoutinesTutorial = ({
    onCreateRoutine,
    routineType,
    hasDailySection,
    isSectionModalOpen,
    isScheduleModalOpen,
    hasRoutines,
    hasScheduleToday
}: UseRoutinesTutorialOptions) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [routineStep, setRoutineStep] = useState(0);
    const { tutorialPhase, setPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState();

    useEffect(() => {
        if (tutorialPhase === "routines-dashboard") {
            setPhase("routines");
        }
    }, [tutorialPhase, setPhase]);

    const completeTutorial = useCallback(async () => {
        const success = await finishTutorial({ dispatch, t });
        if (success) {
            clearPhase();
        }
    }, [dispatch, t, clearPhase]);

    const routineSteps = useMemo(
        () =>
            getRoutineSteps({
                routineType,
                hasDailySection,
                hasScheduleToday,
                hasRoutines,
                isMobile
            }),
        [routineType, hasDailySection, hasScheduleToday, hasRoutines, isMobile]
    );

    const getStepIndex = useCallback(
        (id: string) => routineSteps.findIndex((step) => step.id === id),
        [routineSteps]
    );

    const showRoutineSpotlight = !isTutorialCompleted && tutorialPhase === "routines";

    useEffect(() => {
        if (!showRoutineSpotlight || !isMobile) return;
        const currentStep = routineSteps[routineStep];
        if (currentStep?.id === "routine-schedule") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [showRoutineSpotlight, isMobile, routineStep, routineSteps]);

    useEffect(() => {
        if (tutorialPhase !== "routines") return;
        if (isScheduleModalOpen) {
            const modalIndex = getStepIndex("routine-schedule-modal");
            if (modalIndex >= 0 && routineStep < modalIndex) {
                setRoutineStep(modalIndex);
            }
            return;
        }
        const scheduleModalIndex = getStepIndex("routine-schedule-modal");
        if (hasScheduleToday && scheduleModalIndex >= 0 && routineStep >= scheduleModalIndex) {
            setPhase("routines-summary");
            navigate("/dashboard");
            return;
        }
        if (hasRoutines) {
            const scheduleIndex = getStepIndex("routine-schedule");
            if (scheduleIndex >= 0 && routineStep < scheduleIndex) {
                setRoutineStep(scheduleIndex);
            }
            return;
        }
        if (routineType === "daily" && hasDailySection) {
            const sectionIndex = getStepIndex("routine-section");
            if (sectionIndex >= 0 && routineStep < sectionIndex) {
                setRoutineStep(sectionIndex);
            }
            return;
        }
        if (routineType === "daily" && isSectionModalOpen) {
            const modalIndex = getStepIndex("routine-section-modal");
            if (modalIndex >= 0 && routineStep < modalIndex) {
                setRoutineStep(modalIndex);
            }
            return;
        }
        if (onCreateRoutine) {
            const formIndex = getStepIndex("routine-form");
            if (formIndex >= 0 && routineStep < formIndex) {
                setRoutineStep(formIndex);
            }
            return;
        }
        const startIndex = getStepIndex("create-routine");
        const safeStart = startIndex >= 0 ? startIndex : 0;
        if (routineStep < safeStart) {
            setRoutineStep(safeStart);
        }
    }, [
        tutorialPhase,
        onCreateRoutine,
        hasRoutines,
        hasScheduleToday,
        routineType,
        hasDailySection,
        isSectionModalOpen,
        isScheduleModalOpen,
        navigate,
        routineSteps,
        routineStep,
        setPhase,
        getStepIndex
    ]);

    return {
        routineSteps,
        routineStep,
        setRoutineStep,
        showRoutineSpotlight,
        onComplete: completeTutorial,
        onSkip: completeTutorial
    };
};
