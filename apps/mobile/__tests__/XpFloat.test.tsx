/** XpFloat (P3-T6) — renders the "+N XP" amount. */
import { render, screen } from '@testing-library/react-native';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import XpFloat from '../src/ui/dashboard/XpFloat';

describe('XpFloat', () => {
  it('renders the xp amount', async () => {
    await render(
      <BeyouThemeProvider>
        <XpFloat xp={25} />
      </BeyouThemeProvider>,
    );
    expect(screen.getByTestId('xp-float')).toBeTruthy();
    expect(screen.getByText('+25 XP')).toBeTruthy();
  });
});
