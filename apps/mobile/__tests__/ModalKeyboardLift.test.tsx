/**
 * Every Modal with something to type in has to give up the bottom while the keyboard
 * is up.
 *
 * A Modal is its own window. React Native hands it SOFT_INPUT_ADJUST_RESIZE, and
 * Android 15 ignores that under the edge-to-edge layout Expo enforces, so nothing
 * moves on its own: whatever sits low in the dialog stays behind the keyboard. That is
 * how the AI onboarding shipped with its "add your own" field covered, and the forms
 * with Cancel and Save unreachable under the keyboard while a field was focused.
 *
 * One test per shell, in one file, because it is one rule: the container takes the
 * hook's padding and hands it back its own layout. A new Modal with a field in it
 * belongs in the table below. The arithmetic is covered case by case in
 * keyboard.test.tsx, and the two shells that had the fix first keep their own suites
 * (AgentChatKeyboard, AiOnboardingKeyboard).
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('expo-localization', () => ({
  getCalendars: () => [{ timeZone: 'UTC' }],
  getLocales: () => [{ languageCode: 'en' }],
}));

import type { ReactElement } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import FormModal from '../src/ui/form/FormModal';
import RoutineBuilder from '../src/ui/routines/RoutineBuilder';
import GoalProgressModal from '../src/ui/goals/GoalProgressModal';
import ProfileSection from '../src/ui/config/ProfileSection';
import RoutineSettingsSection from '../src/ui/config/RoutineSettingsSection';
import DeleteAccountSheet from '../src/ui/config/DeleteAccountSheet';

const listeners: Record<string, (event: unknown) => void> = {};

const mount = async (node: ReactElement, insetBottom = 0) => {
  await act(async () => {
    render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: insetBottom, left: 0, right: 0 }}>
        <Provider store={makeStore()}>
          <BeyouThemeProvider>{node}</BeyouThemeProvider>
        </Provider>
      </SafeAreaInsetsContext.Provider>,
    );
  });
};

const paddingBottom = (testID: string) => {
  const style = screen.getByTestId(testID).props.style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean)).paddingBottom ?? 0;
};

/**
 * The container's own measured height is half of the lift, so the layout comes first: a
 * 900-tall window with the keyboard's top at 580 is 320 to give up. The reported
 * `height` rides along the way the real event carries it, and is deliberately smaller
 * than the gap, because on the device it stops at the navigation bar.
 */
const measure = async (avoider: string, height = 900) => {
  await act(async () => {
    fireEvent(screen.getByTestId(avoider), 'layout', {
      persist: () => {},
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height } },
    });
  });
};

const showKeyboard = async (screenY = 580) => {
  await act(async () => {
    listeners.keyboardDidShow?.({ endCoordinates: { screenY, height: 296 } });
  });
};

const hideKeyboard = async () => {
  await act(async () => {
    listeners.keyboardDidHide?.({});
  });
};

beforeEach(() => {
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  for (const key of Object.keys(listeners)) delete listeners[key];
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    handler: (payload: unknown) => void,
  ) => {
    listeners[event] = handler;
    return { remove: () => delete listeners[event] };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * `avoider` is the container the lift is applied to; `open` is the control that puts
 * the dialog on screen, for the two that live inside a settings section.
 */
const SHELLS: {
  what: string;
  avoider: string;
  open?: string;
  node: () => ReactElement;
}[] = [
  {
    // Habit, goal, task and category forms all render through this one.
    what: 'the forms shell',
    avoider: 'form-modal',
    node: () => (
      <FormModal
        visible
        title="Create habit"
        submitLabel="Save habit"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        testID="form-modal"
      >
        <TextInput testID="a-field" />
      </FormModal>
    ),
  },
  {
    what: 'the routine builder',
    avoider: 'routine-builder-keyboard-avoider',
    node: () => (
      <RoutineBuilder
        visible
        mode="create"
        habits={[] as never[]}
        tasks={[] as never[]}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />
    ),
  },
  {
    what: 'the goal progress dialog',
    avoider: 'goal-progress-modal-keyboard-avoider',
    node: () => (
      <GoalProgressModal
        visible
        name="Read"
        currentValue={10}
        targetValue={100}
        onClose={jest.fn()}
        onApply={jest.fn(async () => {})}
      />
    ),
  },
  {
    what: 'the profile photo dialog',
    avoider: 'photo-modal-keyboard-avoider',
    open: 'change-photo',
    node: () => <ProfileSection />,
  },
  {
    what: 'the timezone picker',
    avoider: 'timezone-modal-keyboard-avoider',
    open: 'timezone-trigger',
    node: () => <RoutineSettingsSection />,
  },
  {
    what: 'the delete-account dialog',
    avoider: 'delete-account-keyboard-avoider',
    node: () => <DeleteAccountSheet visible onClose={jest.fn()} />,
  },
];

for (const shell of SHELLS) {
  it(`lifts ${shell.what} clear of the keyboard, and gives the space back after`, async () => {
    await mount(shell.node());
    if (shell.open) {
      await act(async () => {
        fireEvent.press(screen.getByTestId(shell.open as string));
      });
    }

    await measure(shell.avoider);
    await showKeyboard();
    expect(paddingBottom(shell.avoider)).toBe(320);

    await hideKeyboard();
    // Back to nothing, or the dialog stays lifted off the bottom for the rest of its
    // life with the screen behind showing through the gap.
    expect(paddingBottom(shell.avoider)).toBe(0);
  });
}

/**
 * The other half of the rule, and the one a refactor is most likely to undo: the
 * navigation bar's inset has to GO while the keyboard is up, not add to the lift. That
 * bar is behind the keyboard, so keeping its padding leaves a strip of empty footer
 * under Cancel and Save.
 */
it('drops the navigation bar inset from the form footer while the keyboard is up', async () => {
  await mount(
    <FormModal
      visible
      title="Create habit"
      submitLabel="Save habit"
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      testID="form-modal"
    >
      <TextInput testID="a-field" />
    </FormModal>,
    24,
  );

  expect(paddingBottom('form-modal-footer')).toBe(36);

  await measure('form-modal');
  await showKeyboard();
  expect(paddingBottom('form-modal-footer')).toBe(12);

  await hideKeyboard();
  expect(paddingBottom('form-modal-footer')).toBe(36);
});
