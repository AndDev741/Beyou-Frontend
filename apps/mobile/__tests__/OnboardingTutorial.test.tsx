/**
 * OnboardingTutorial (Phase 8 — Task 5; fork panel — AI onboarding Task 2) —
 * 5-step carousel intro modal. Steps: Categories, Habits, Tasks, Routines, Goals.
 * Final next now shows a path fork (AI vs manual): manual → onComplete,
 * AI → onChooseAi. Also verifies skip → onSkip.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import OnboardingTutorial from '../src/ui/tutorial/OnboardingTutorial';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

const walkToFork = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-next'));
    });
  }
};

describe('OnboardingTutorial', () => {
  it('walking all 5 steps shows the path fork', async () => {
    const onComplete = jest.fn();
    const onChooseAi = jest.fn();
    await wrap(
      <OnboardingTutorial onComplete={onComplete} onSkip={jest.fn()} onChooseAi={onChooseAi} />
    );
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        fireEvent.press(screen.getByTestId('onboarding-next'));
      });
    }
    expect(screen.queryByText('How do you want to start?')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-next'));
    });
    expect(screen.getByText('How do you want to start?')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onChooseAi).not.toHaveBeenCalled();
  });

  it('choosing the AI path fires onChooseAi and not onComplete', async () => {
    const onComplete = jest.fn();
    const onChooseAi = jest.fn();
    await wrap(
      <OnboardingTutorial onComplete={onComplete} onSkip={jest.fn()} onChooseAi={onChooseAi} />
    );
    await walkToFork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tutorial-path-ai'));
    });
    expect(onChooseAi).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('choosing the manual path fires onComplete', async () => {
    const onComplete = jest.fn();
    const onChooseAi = jest.fn();
    await wrap(
      <OnboardingTutorial onComplete={onComplete} onSkip={jest.fn()} onChooseAi={onChooseAi} />
    );
    await walkToFork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tutorial-path-manual'));
    });
    expect(onComplete).toHaveBeenCalled();
    expect(onChooseAi).not.toHaveBeenCalled();
  });

  it('skip fires onSkip', async () => {
    const onSkip = jest.fn();
    await wrap(
      <OnboardingTutorial onComplete={jest.fn()} onSkip={onSkip} onChooseAi={jest.fn()} />
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-skip'));
    });
    expect(onSkip).toHaveBeenCalled();
  });
});
