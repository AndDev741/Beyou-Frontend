import type { SpotlightStep } from './types';

export const dashboardSteps: SpotlightStep[] = [
  { id: 'profile', targetId: 'dashboard-profile', titleKey: 'TutorialSpotlightProfileTitle', descKey: 'TutorialSpotlightProfileDescription' },
  { id: 'go-categories', targetId: 'nav-categories', titleKey: 'TutorialSpotlightCategoriesTitle', descKey: 'TutorialSpotlightCategoriesDescription', nextLabelKey: 'TutorialGoToCategories' },
];
