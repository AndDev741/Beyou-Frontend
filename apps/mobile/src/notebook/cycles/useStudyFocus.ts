import { useCallback } from 'react';
import { useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { BlockTarget, StudyPageRef, StudyTopicRef } from '@beyou/types/notebook/studyCycle';
import { useNotebookFocus } from '../useNotebookFocus';
import { notify } from '../../notify';
import type { RootState } from '../../store';
import { studyPageOf } from './cycleText';

/**
 * "Focus 25" on a study block: the notebook's own pomodoro, filed against the block's concept,
 * else the page it carries, else its topic. A pomodoro on any page of the topic counts for the
 * cycle, so the minutes reach the block when `PomodoroOwner` reports the cycle.
 *
 * The topic's habit rides along when the notebook knows it, the same way the page screen passes
 * `page.habit`, so the focus screen opens on that habit's routine item.
 */
export function useStudyFocus() {
  const { t } = useTranslation();
  const store = useStore<RootState>();
  const startFocus = useNotebookFocus();

  return useCallback(
    (block: { topic: StudyTopicRef; page: StudyPageRef | null; target: BlockTarget | null }): boolean => {
      const notebook = store.getState().notebook;
      const habitId =
        notebook.home?.topics.find((topic) => topic.id === block.topic.id)?.habit?.id ??
        notebook.pages[block.topic.id]?.habit?.id ??
        null;
      const started = startFocus(studyPageOf(block), habitId);
      notify.info(t(started ? 'NotebookMobileFocusStarted' : 'NotebookMobileFocusAlreadyRunning'));
      return started;
    },
    [startFocus, store, t],
  );
}
