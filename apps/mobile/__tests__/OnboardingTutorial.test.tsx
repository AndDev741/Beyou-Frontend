/**
 * OnboardingTutorial (Phase 8 — Task 5) — 5-step carousel intro modal.
 * Steps: Categories, Habits, Tasks, Routines, Goals.
 * Test walks all 5 steps (4x next) then checks onComplete fires on final next;
 * also verifies skip → onSkip.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import OnboardingTutorial from '../src/ui/tutorial/OnboardingTutorial';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

describe('OnboardingTutorial', () => {
  it('walks all 5 steps then completes', async () => {
    const onComplete = jest.fn();
    await wrap(<OnboardingTutorial onComplete={onComplete} onSkip={jest.fn()} />);
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        fireEvent.press(screen.getByTestId('onboarding-next'));
      });
    }
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-next'));
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('skip fires onSkip', async () => {
    const onSkip = jest.fn();
    await wrap(<OnboardingTutorial onComplete={jest.fn()} onSkip={onSkip} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-skip'));
    });
    expect(onSkip).toHaveBeenCalled();
  });
});
