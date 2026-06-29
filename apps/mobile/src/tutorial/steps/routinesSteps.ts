import type { SpotlightStep } from './types';

export const routinesSteps: SpotlightStep[] = [
  {
    id: 'add',
    targetId: 'routine-add',
    titleKey: 'TutorialSpotlightCreateRoutineTitle',
    descKey: 'TutorialSpotlightCreateRoutineDescription',
  },
  {
    id: 'name',
    targetId: 'routine-name',
    titleKey: 'TutorialRoutineNameTitle',
    descKey: 'TutorialRoutineNameDescription',
  },
  {
    id: 'section',
    targetId: 'routine-add-section',
    titleKey: 'TutorialRoutineSectionTitle',
    descKey: 'TutorialRoutineSectionDescription',
    disabledHintKey: 'TutorialHintAddSection',
  },
  {
    id: 'save',
    targetId: 'routine-save',
    titleKey: 'TutorialRoutineSaveTitle',
    descKey: 'TutorialRoutineSaveDescription',
    disabledHintKey: 'TutorialHintSaveRoutine',
  },
  {
    id: 'schedule',
    targetId: 'routine-schedule',
    titleKey: 'TutorialSpotlightScheduleTitle',
    descKey: 'TutorialSpotlightScheduleDescription',
  },
  {
    id: 'go-config',
    targetId: 'nav-config',
    titleKey: 'TutorialSpotlightConfigTitle',
    descKey: 'TutorialSpotlightConfigDescription',
    nextLabelKey: 'TutorialGoToConfig',
  },
];
