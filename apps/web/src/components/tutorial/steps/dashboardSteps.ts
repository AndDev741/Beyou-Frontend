import type { SpotlightStep } from "../SpotlightTutorial";

export const getDashboardSteps = (): SpotlightStep[] => [
    {
        id: "profile",
        targetSelector: "[data-tutorial-id='dashboard-profile']",
        titleKey: "TutorialSpotlightProfileTitle",
        descriptionKey: "TutorialSpotlightProfileDescription",
        position: "bottom"
    },
    {
        id: "shortcuts",
        targetSelector: "[data-tutorial-id='dashboard-shortcuts']",
        titleKey: "TutorialSpotlightShortcutsTitle",
        descriptionKey: "TutorialSpotlightShortcutsDescription",
        position: "right"
    },
    {
        id: "categories-shortcut",
        targetSelector: "[data-tutorial-id='shortcut-categories']",
        titleKey: "TutorialSpotlightCategoriesTitle",
        descriptionKey: "TutorialSpotlightCategoriesDescription",
        position: "right",
        action: "click"
    }
];

export const getHabitsDashboardSteps = (): SpotlightStep[] => [
    {
        id: "habits-shortcut",
        targetSelector: "[data-tutorial-id='shortcut-habits']",
        titleKey: "TutorialSpotlightHabitsTitle",
        descriptionKey: "TutorialSpotlightHabitsDescription",
        position: "right",
        action: "click"
    }
];

export const getRoutinesDashboardSteps = (): SpotlightStep[] => [
    {
        id: "routines-shortcut",
        targetSelector: "[data-tutorial-id='shortcut-routines']",
        titleKey: "TutorialSpotlightRoutinesTitle",
        descriptionKey: "TutorialSpotlightRoutinesDescription",
        position: "right",
        action: "click"
    }
];

export const getRoutineSummarySteps = (): SpotlightStep[] => [
    {
        id: "routine-today",
        targetSelector: "[data-tutorial-id='dashboard-routine-today']",
        titleKey: "TutorialSpotlightRoutineTodayTitle",
        descriptionKey: "TutorialSpotlightRoutineTodayDescription",
        position: "bottom",
        forceNextLabel: true
    }
];

export const getConfigDashboardSteps = (): SpotlightStep[] => [
    {
        id: "config-shortcut",
        targetSelector: "[data-tutorial-id='shortcut-configuration']",
        titleKey: "TutorialSpotlightConfigurationTitle",
        descriptionKey: "TutorialSpotlightConfigurationDescription",
        position: "right",
        action: "click"
    }
];
