import type { SpotlightStep } from './types';

export const habitsSteps: SpotlightStep[] = [
  {
    id: 'create-habit',
    targetId: 'habit-create',
    titleKey: 'TutorialSpotlightCreateHabitTitle',
    descKey: 'TutorialSpotlightCreateHabitDescription',
    disabledHintKey: 'TutorialHintCreateHabit',
  },
  {
    id: 'habit-list',
    targetId: 'habit-first',
    titleKey: 'TutorialSpotlightHabitListTitle',
    descKey: 'TutorialSpotlightHabitListDescription',
    nextLabelKey: 'TutorialGoToRoutines',
  },
];
