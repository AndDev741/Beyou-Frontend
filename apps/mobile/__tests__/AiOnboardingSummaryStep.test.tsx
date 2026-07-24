/**
 * SummaryStep (AI onboarding — Task 6) — final wizard screen: celebratory
 * header, created entity names grouped under the AiOnboardingSummary* labels
 * (empty groups omitted, routineName as its own single-row group), and the
 * two CTAs (start using the app / take the manual tour). Mirrors the web
 * SummaryStep contract.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SummaryStep from '../src/ui/aiOnboarding/SummaryStep';
import type { WizardData } from '../src/ui/aiOnboarding/AiOnboardingWizard';

const fullData: WizardData = {
  categories: [{ id: 'c1', name: 'Health' }],
  habits: [
    { id: 'h1', name: 'Run' },
    { id: 'h2', name: 'Meditate' },
  ],
  tasks: [{ id: 't1', name: 'Buy shoes' }],
  routineName: 'Morning flow',
  goals: [{ id: 'g1', name: 'Run 100 km' }],
  freeTexts: ['something calm'],
};

const wrap = async (data: WizardData = fullData) => {
  const props = { data, onStart: jest.fn(), onTour: jest.fn() };
  await render(
    <BeyouThemeProvider>
      <SummaryStep {...props} />
    </BeyouThemeProvider>
  );
  return props;
};

describe('AiOnboarding SummaryStep', () => {
  it('renders the celebratory header and every created name under its group label', async () => {
    await wrap();
    expect(screen.getByText("You're all set!")).toBeTruthy();
    expect(screen.getByText("Here's what we created together.")).toBeTruthy();

    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Habits')).toBeTruthy();
    expect(screen.getByText('Run')).toBeTruthy();
    expect(screen.getByText('Meditate')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Buy shoes')).toBeTruthy();
    expect(screen.getByText('Routine')).toBeTruthy();
    expect(screen.getByText('Morning flow')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('Run 100 km')).toBeTruthy();
  });

  it('omits empty groups (no tasks/routine/goals labels when nothing was created)', async () => {
    await wrap({
      categories: [{ id: 'c1', name: 'Health' }],
      habits: [],
      tasks: [],
      goals: [],
      freeTexts: [],
    });
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.queryByText('Habits')).toBeNull();
    expect(screen.queryByText('Tasks')).toBeNull();
    expect(screen.queryByText('Routine')).toBeNull();
    expect(screen.queryByText('Goals')).toBeNull();
  });

  it('start CTA fires onStart and the tour CTA fires onTour', async () => {
    const props = await wrap();
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-start'));
    });
    expect(props.onStart).toHaveBeenCalledTimes(1);
    expect(props.onTour).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-tour'));
    });
    expect(props.onTour).toHaveBeenCalledTimes(1);
  });
});
