import type { SpotlightStep } from './types';

export const categoriesSteps: SpotlightStep[] = [
  {
    id: 'create-category',
    targetId: 'category-create',
    titleKey: 'TutorialSpotlightCreateCategoryTitle',
    descKey: 'TutorialSpotlightCreateCategoryDescription',
    disabledHintKey: 'TutorialHintCreateCategory',
  },
  {
    id: 'category-list',
    targetId: 'category-first',
    titleKey: 'TutorialSpotlightCategoryListTitle',
    descKey: 'TutorialSpotlightCategoryListDescription',
    nextLabelKey: 'TutorialGoToHabits',
  },
];
