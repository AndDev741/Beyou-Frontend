import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useTutorialPhaseState } from "./useTutorialPhaseState";
import { completeTutorial as finishTutorial } from "../flow/completeTutorial";
import { useIsMobile } from "../utils/useIsMobile";
import { getCategorySteps } from "../steps/categoriesSteps";

type UseCategoriesTutorialOptions = {
    hasCategories: boolean;
};

export const useCategoriesTutorial = ({ hasCategories }: UseCategoriesTutorialOptions) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [categoryStep, setCategoryStep] = useState(0);
    const { tutorialPhase, setPhase, clearPhase, isTutorialCompleted } = useTutorialPhaseState();

    useEffect(() => {
        if (tutorialPhase !== "categories") return;
        setCategoryStep(hasCategories ? 1 : 0);
    }, [tutorialPhase, hasCategories]);

    const completeTutorial = useCallback(async () => {
        const success = await finishTutorial({ dispatch, t });
        if (success) {
            clearPhase();
        }
    }, [dispatch, t, clearPhase]);

    const advanceToHabitsFlow = useCallback(() => {
        setPhase("habits-dashboard");
    }, [setPhase]);

    const categorySteps = useMemo(
        () => getCategorySteps({ isMobile, hasCategories }),
        [isMobile, hasCategories]
    );

    const showCategorySpotlight = !isTutorialCompleted && tutorialPhase === "categories";

    return {
        categorySteps,
        categoryStep,
        setCategoryStep,
        showCategorySpotlight,
        onComplete: advanceToHabitsFlow,
        onSkip: completeTutorial
    };
};
