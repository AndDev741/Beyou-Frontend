import type { SpotlightStep } from './types';

// One step per settings section, reusing the section's own title/description i18n.
// The last step's Next finishes the tutorial (→ 'done' → dashboard finale).
export const configSteps: SpotlightStep[] = [
  { id: 'profile', targetId: 'config-profile', titleKey: 'ConfigSectionProfile', descKey: 'ConfigSectionProfileDesc' },
  { id: 'appearance', targetId: 'config-appearance', titleKey: 'ConfigSectionAppearance', descKey: 'ConfigSectionAppearanceDesc' },
  { id: 'preferences', targetId: 'config-preferences', titleKey: 'ConfigSectionPreferences', descKey: 'ConfigSectionPreferencesDesc' },
  { id: 'dashboard', targetId: 'config-dashboard', titleKey: 'ConfigSectionDashboard', descKey: 'ConfigSectionDashboardDesc' },
  { id: 'tutorial', targetId: 'config-tutorial', titleKey: 'Tutorial', descKey: 'TutorialDescription', nextLabelKey: 'TutorialGetStarted' },
];
