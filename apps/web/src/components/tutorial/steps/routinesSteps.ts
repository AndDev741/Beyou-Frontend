import type { SpotlightStep } from "../SpotlightTutorial";

type RoutineStepsOptions = {
    routineType: string;
    hasDailySection: boolean;
    hasScheduleToday: boolean;
    hasRoutines: boolean;
    isMobile: boolean;
};

export const getRoutineSteps = ({
    routineType,
    hasDailySection,
    hasScheduleToday,
    hasRoutines,
    isMobile
}: RoutineStepsOptions): SpotlightStep[] => {
    const routineFormStep: SpotlightStep = routineType === "daily"
        ? {
            id: "routine-form",
            targetSelector: "[data-tutorial-id='routine-daily-form']",
            titleKey: "TutorialSpotlightRoutineDailyFormTitle",
            descriptionKey: "TutorialSpotlightRoutineDailyFormDescription",
            position: isMobile ? "top" : "left",
            disableNext: !hasDailySection
        }
        : {
            id: "routine-form",
            targetSelector: "[data-tutorial-id='routine-create-area']",
            titleKey: "TutorialSpotlightRoutineFormTitle",
            descriptionKey: "TutorialSpotlightRoutineFormDescription",
            position: isMobile ? "top" : "left",
            disableNext: !hasRoutines
        };

    const steps: SpotlightStep[] = [
        {
            id: "create-routine",
            targetSelector: "[data-tutorial-id='routine-add-button']",
            titleKey: "TutorialSpotlightCreateRoutineTitle",
            descriptionKey: "TutorialSpotlightCreateRoutineDescription",
            position: isMobile ? "top" : "right",
            action: "click"
        },
        routineFormStep
    ];

    if (routineType === "daily") {
        steps.push({
            id: "routine-section-modal",
            targetSelector: "[data-tutorial-id='routine-section-modal']",
            titleKey: "TutorialSpotlightRoutineSectionModalTitle",
            descriptionKey: "TutorialSpotlightRoutineSectionModalDescription",
            position: isMobile ? "top" : "right",
            disableNext: !hasDailySection
        });
    }

    steps.push(
        {
            id: "routine-section",
            targetSelector: "[data-tutorial-id='routine-section-item']",
            titleKey: "TutorialSpotlightRoutineSectionTitle",
            descriptionKey: "TutorialSpotlightRoutineSectionDescription",
            position: isMobile ? "top" : "bottom"
        },
        {
            id: "routine-schedule",
            targetSelector: "[data-tutorial-id='routine-schedule-button']",
            titleKey: "TutorialSpotlightRoutineScheduleTitle",
            descriptionKey: "TutorialSpotlightRoutineScheduleDescription",
            position: isMobile ? "top" : "bottom",
            disableNext: !hasScheduleToday
        },
        {
            id: "routine-schedule-modal",
            targetSelector: "[data-tutorial-id='routine-schedule-modal']",
            titleKey: "TutorialSpotlightRoutineScheduleModalTitle",
            descriptionKey: "TutorialSpotlightRoutineScheduleModalDescription",
            position: isMobile ? "top" : "right",
            disableNext: !hasScheduleToday
        }
    );

    return steps;
};
