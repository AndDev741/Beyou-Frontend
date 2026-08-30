/**
 * How an assistant turn reports what the agent DID.
 *
 * The redesign splits tool runs in two: a read is a discrete chip ("Routines
 * checked") because there is nothing to go and look at, while a write becomes a
 * card with a link into the section it touched — the user confirms the change in
 * one tap instead of taking the reply's word for it.
 *
 * The link is labelled with the DESTINATION, not the entity: the tool event only
 * reports which domain it touched, so naming the entity would be invention.
 */
jest.mock('expo-router', () => ({
  // The real module's focus hook: screens use it to refresh on the way back.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

import { render, screen, fireEvent, act } from '@testing-library/react-native';
import type { agentSegment } from '@beyou/types/agent/chatType';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AgentSegments, { destinationFor } from '../src/ui/agent/AgentSegments';

const onInternalLink = jest.fn();

const renderSegments = async (segments: agentSegment[]) =>
  render(
    <BeyouThemeProvider>
      <AgentSegments segments={segments} onInternalLink={onInternalLink} />
    </BeyouThemeProvider>,
  );

beforeEach(() => {
  onInternalLink.mockClear();
});

describe('AgentSegments tool rendering', () => {
  it('shows a read as a chip with nothing to open', async () => {
    await renderSegments([{ type: 'tool', tool: 'getUserRoutines', status: 'finished' }]);

    expect(screen.getByText('Routines checked')).toBeTruthy();
    expect(screen.queryByLabelText('Routines')).toBeNull();
  });

  it('shows a write as a card linking to the section it changed', async () => {
    await renderSegments([
      { type: 'tool', tool: 'createUserHabit', status: 'finished', domains: ['habits'] },
    ]);

    expect(screen.getByText('Habit created')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Habits'));
    });
    expect(onInternalLink).toHaveBeenCalledWith('/habits');
  });

  it('keeps a failed write as a chip — there is nothing to go and see', async () => {
    await renderSegments([
      { type: 'tool', tool: 'createUserHabit', status: 'finished', error: 'boom' },
    ]);

    expect(screen.getByText(/Habit created/)).toBeTruthy();
    expect(screen.queryByLabelText('Habits')).toBeNull();
  });

  it('keeps a still-running write as a chip until it resolves', async () => {
    await renderSegments([{ type: 'tool', tool: 'createUserGoal', status: 'started' }]);

    expect(screen.getByText('Goal created')).toBeTruthy();
    expect(screen.queryByLabelText('Goals')).toBeNull();
  });

  it('renders text segments alongside the tools', async () => {
    await renderSegments([
      { type: 'tool', tool: 'getUserGoals', status: 'finished' },
      { type: 'text', text: 'All set!' },
    ]);

    expect(screen.getByText('Goals checked')).toBeTruthy();
    expect(screen.getByText('All set!')).toBeTruthy();
  });
});

describe('destinationFor', () => {
  it('sends micro-task writes to the focus screen, not to the tasks page', () => {
    // Every one of these has "Task" in its name and none of them is about a task.
    // `/Task/` matched them all and the card offered a trip to /tasks to look for
    // something that was never going to be there.
    for (const tool of [
      'addMicroTask',
      'toggleMicroTask',
      'pinMicroTask',
      'deleteMicroTask',
      'reorderMicroTasks',
    ]) {
      expect(destinationFor(tool)?.route).toBe('/focus');
    }
  });

  it('leaves the focus reads as chips, with nothing to open', () => {
    expect(destinationFor('getItemMicroTasks')).toBeNull();
    expect(destinationFor('getFocusDay')).toBeNull();
  });

  it.each([
    ['createUserHabit', '/habits'],
    ['editUserCategory', '/categories'],
    ['deleteUserTask', '/tasks'],
    ['increaseUserGoalValue', '/goals'],
    ['createUserSchedule', '/routines'],
    ['checkRoutineItem', '/routines'],
    ['updateUserConfiguration', '/configuration'],
  ])('sends %s to %s', (tool, route) => {
    expect(destinationFor(tool)?.route).toBe(route);
  });

  it('sends a routine-item tool to the routine, not to the item type', () => {
    // `addTaskToRoutineSection` names two entities; what the user wants to check
    // is the routine that changed.
    expect(destinationFor('addTaskToRoutineSection')?.route).toBe('/routines');
    expect(destinationFor('addHabitToRoutineSection')?.route).toBe('/routines');
  });

  it('has no destination for the agent memory tools', () => {
    // There is no screen for the agent's remembered context, so those stay chips.
    expect(destinationFor('updateGlobalContext')).toBeNull();
    expect(destinationFor('updateChatContext')).toBeNull();
  });
});
