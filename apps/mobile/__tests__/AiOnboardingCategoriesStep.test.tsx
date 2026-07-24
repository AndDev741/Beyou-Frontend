/**
 * CategoriesStep (AI onboarding — Task 3) — default chip cloud + custom
 * category input + continue gating. Mirrors the web CategoriesStep: 18
 * default chips from DEFAULT_CATEGORIES, toggle selection, case-insensitive
 * custom add (auto-selected), Continue disabled with zero selection.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategoriesStep from '../src/ui/aiOnboarding/CategoriesStep';

const DEFAULT_NAMES = [
  'Health',
  'Career',
  'Finances',
  'Studies',
  'Family',
  'Spirituality',
  'Fitness',
  'Nutrition',
  'Sleep',
  'Relationships',
  'Creativity',
  'Reading',
  'Mindfulness',
  'Social life',
  'Home',
  'Leisure',
  'Travel',
  'Productivity',
];

const wrap = async (onContinue = jest.fn(), loading = false) => {
  await render(
    <BeyouThemeProvider>
      <CategoriesStep onContinue={onContinue} loading={loading} />
    </BeyouThemeProvider>
  );
  return onContinue;
};

describe('AiOnboarding CategoriesStep', () => {
  it('renders the 18 default category chips', async () => {
    await wrap();
    for (const name of DEFAULT_NAMES) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it('selecting a chip and pressing Continue calls onContinue with its name', async () => {
    const onContinue = await wrap();
    await act(async () => {
      fireEvent.press(screen.getByText('Health'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-continue'));
    });
    expect(onContinue).toHaveBeenCalledWith(['Health']);
  });

  it('adding a custom name creates a selected chip and dedupes case-insensitively', async () => {
    const onContinue = await wrap();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-custom-input'), 'Surfing');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-add'));
    });
    expect(screen.getByText('Surfing')).toBeTruthy();

    // Duplicate (different case) of an existing default chip is NOT added again.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-custom-input'), 'health');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-add'));
    });
    expect(screen.getAllByText(/^health$/i)).toHaveLength(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-continue'));
    });
    expect(onContinue).toHaveBeenCalledWith(['Surfing']);
  });

  it('Continue is disabled with zero selection', async () => {
    const onContinue = await wrap();
    const continueBtn = screen.getByTestId('ai-onboarding-continue');
    expect(continueBtn.props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      fireEvent.press(continueBtn);
    });
    expect(onContinue).not.toHaveBeenCalled();
  });
});
