import type { SpotlightStep } from "../SpotlightTutorial";

type CategoryStepsOptions = {
    isMobile: boolean;
    hasCategories: boolean;
};

export const getCategorySteps = ({ isMobile, hasCategories }: CategoryStepsOptions): SpotlightStep[] => [
    {
        id: "create-category",
        targetSelector: "[data-tutorial-id='category-create-form']",
        titleKey: "TutorialSpotlightCreateCategoryTitle",
        descriptionKey: "TutorialSpotlightCreateCategoryDescription",
        position: isMobile ? "top" : "left",
        disableNext: !hasCategories
    },
    {
        id: "category-list",
        targetSelector: "[data-tutorial-id='category-card']",
        titleKey: "TutorialSpotlightCategoryListTitle",
        descriptionKey: "TutorialSpotlightCategoryListDescription",
        position: "bottom"
    }
];
