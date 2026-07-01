import type { SpotlightStep } from "../SpotlightTutorial";

// One step per settings section (Tutorial replay lives inside Preferences on web),
// reusing each section's own title/description i18n. The last step's Next finishes
// the tutorial → 'done' phase → dashboard finale.
export const getConfigSteps = (): SpotlightStep[] => [
    {
        id: "config-profile",
        targetSelector: "[data-tutorial-id='config-profile']",
        titleKey: "ConfigSectionProfile",
        descriptionKey: "ConfigSectionProfileDesc",
        position: "auto"
    },
    {
        id: "config-appearance",
        targetSelector: "[data-tutorial-id='config-appearance']",
        titleKey: "ConfigSectionAppearance",
        descriptionKey: "ConfigSectionAppearanceDesc",
        position: "auto"
    },
    {
        id: "config-preferences",
        targetSelector: "[data-tutorial-id='config-preferences']",
        titleKey: "ConfigSectionPreferences",
        descriptionKey: "ConfigSectionPreferencesDesc",
        position: "auto"
    },
    {
        id: "config-dashboard",
        targetSelector: "[data-tutorial-id='config-dashboard']",
        titleKey: "ConfigSectionDashboard",
        descriptionKey: "ConfigSectionDashboardDesc",
        position: "auto"
    }
];
