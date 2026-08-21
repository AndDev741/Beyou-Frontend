/**
 * The field you are typing into has to stay where you can see it.
 *
 * Every step of the AI onboarding ends in an "add your own" input near the bottom of
 * the screen, and the wizard is a Modal — its own window, which React Native hands
 * SOFT_INPUT_ADJUST_RESIZE and which Android 15 then ignores under the edge-to-edge
 * layout Expo enforces. So nothing moved: the keyboard came up over the input, the Add
 * button and Continue, and you typed a category name you could not read.
 *
 * What this pins is that the wizard shell is wired to the lift at all: the container
 * takes the hook's padding and hands it back its own layout. The arithmetic, including
 * the return to zero, is covered case by case in keyboard.test.tsx.
 */
jest.mock('expo-secure-store', () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      m.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      m.delete(k);
    }),
  };
});
jest.mock('@beyou/api/onboarding/fetchOnboardingSuggestions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Keyboard } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AiOnboardingWizard from '../src/ui/aiOnboarding/AiOnboardingWizard';

const listeners: Record<string, (event: unknown) => void> = {};

const renderWizard = async () => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AiOnboardingWizard
            visible
            onFinish={jest.fn()}
            onTakeTour={jest.fn()}
            onClosed={jest.fn()}
          />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

const padding = () => {
  const style = screen.getByTestId('ai-onboarding-keyboard-avoider').props.style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean)).paddingBottom ?? 0;
};

/**
 * The container's own height is half of the sum, so the layout has to happen before the
 * keyboard does. A 900-tall window with the keyboard's top at 580 is 320 to give up.
 */
const measure = async (height: number) => {
  await act(async () => {
    fireEvent(screen.getByTestId('ai-onboarding-keyboard-avoider'), 'layout', {
      persist: () => {},
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height } },
    });
  });
};

beforeEach(() => {
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

it('gives up the bottom of the wizard while the keyboard is up, and takes it back after', async () => {
  await renderWizard();
  await measure(900);

  await act(async () => {
    listeners.keyboardDidShow?.({ endCoordinates: { screenY: 580, height: 296 } });
  });
  // Without this the step's input is behind the keyboard being typed on.
  expect(padding()).toBe(320);

  await act(async () => {
    listeners.keyboardDidHide?.({});
  });
  // And back, or the wizard sits above the bottom of the screen for the rest of its life.
  expect(padding()).toBe(0);
});

it('renders the input it is protecting', async () => {
  await renderWizard();

  expect(screen.getByTestId('ai-onboarding-custom-input')).toBeTruthy();
});
