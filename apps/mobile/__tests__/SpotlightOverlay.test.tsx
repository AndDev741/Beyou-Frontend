// apps/mobile/__tests__/SpotlightOverlay.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { TutorialProvider } from '../src/tutorial/TutorialProvider';
import SpotlightOverlay from '../src/ui/tutorial/SpotlightOverlay';

jest.mock('../src/tutorial/TutorialProvider', () => {
  const actual = jest.requireActual('../src/tutorial/TutorialProvider');
  return { ...actual, useTutorialRegistry: () => ({ register: () => {}, unregister: () => {}, measure: async () => ({ x: 40, y: 200, width: 120, height: 48 }) }) };
});

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

const step = { id: 's', targetId: 't', titleKey: 'TutorialNext', descKey: 'TutorialSkip' };
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider><TutorialProvider>{n}</TutorialProvider></BeyouThemeProvider>);

test('renders the tooltip and advances on Next', async () => {
  const onNext = jest.fn();
  await act(async () => {
    wrap(<SpotlightOverlay step={step} stepIndex={0} stepCount={3} onNext={onNext} onSkip={jest.fn()} />);
  });
  await act(async () => { fireEvent.press(screen.getByTestId('spotlight-next')); });
  expect(onNext).toHaveBeenCalled();
});

test('disabled step blocks Next and shows the hint', async () => {
  const onNext = jest.fn();
  const disabledStep = { ...step, disabled: true, disabledHintKey: 'TutorialSkip' };
  await act(async () => {
    wrap(<SpotlightOverlay step={disabledStep} stepIndex={0} stepCount={3} onNext={onNext} onSkip={jest.fn()} />);
  });
  expect(screen.getByTestId('spotlight-hint')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('spotlight-next')); });
  expect(onNext).not.toHaveBeenCalled();
});
