import type { SpotlightStep } from './types';

// Only on-screen controls are spotlit — the builder + schedule sheet are Modals
// (the in-tree overlay View can't draw over them), so they guide themselves. The
// hook auto-advances past `add` once a routine exists, because the Next button is
// hidden while the builder Modal is open. See useRoutinesTutorial.
export const routinesSteps: SpotlightStep[] = [
  {
    id: 'add',
    targetId: 'routine-add',
    titleKey: 'TutorialSpotlightCreateRoutineTitle',
    descKey: 'TutorialSpotlightCreateRoutineDescription',
    disabledHintKey: 'TutorialHintCreateRoutine',
  },
  {
    id: 'schedule',
    targetId: 'routine-schedule',
    titleKey: 'TutorialSpotlightScheduleTitle',
    descKey: 'TutorialSpotlightScheduleDescription',
    nextLabelKey: 'TutorialGoToConfig',
  },
];
