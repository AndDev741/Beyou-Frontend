import type { SpotlightStep } from "../SpotlightTutorial";

type HabitStepsOptions = {
    isMobile: boolean;
    hasHabits: boolean;
};

export const getHabitSteps = ({ isMobile, hasHabits }: HabitStepsOptions): SpotlightStep[] => [
    {
        id: "create-habit",
        targetSelector: "[data-tutorial-id='habit-create-form']",
        titleKey: "TutorialSpotlightCreateHabitTitle",
        descriptionKey: "TutorialSpotlightCreateHabitDescription",
        position: isMobile ? "top" : "left",
        disableNext: !hasHabits
    },
    {
        id: "habit-list",
        targetSelector: "[data-tutorial-id='habit-card']",
        titleKey: "TutorialSpotlightHabitListTitle",
        descriptionKey: "TutorialSpotlightHabitListDescription",
        position: "bottom"
    }
];
