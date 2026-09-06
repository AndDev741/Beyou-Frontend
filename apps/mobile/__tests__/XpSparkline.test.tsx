/**
 * The week of XP as bars, ported from the web. Views instead of SVG so the axis type
 * stays type at any width; a tap writes the day's number into a readout line rather
 * than floating a tooltip the card would clip.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import XpSparkline from '../src/ui/XpSparkline';

const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

const bars = () => screen.getAllByTestId('xp-bar');
/** Height as the percentage of the tallest day the component wrote inline. */
const heightOf = (bar: ReturnType<typeof bars>[number]) =>
  Number.parseFloat(String(StyleSheet.flatten(bar.props.style).height));

describe('XpSparkline', () => {
  it('draws one bar per day', async () => {
    await wrap(<XpSparkline values={[1, 2, 3, 4, 5, 6, 7]} />);
    expect(bars()).toHaveLength(7);
  });

  it('scales to its own best day, with a floor for a day that earned nothing', async () => {
    await wrap(<XpSparkline values={[0, 0, 500]} />);
    const [empty, , tallest] = bars();
    expect(heightOf(tallest)).toBe(100);
    expect(heightOf(empty)).toBeGreaterThan(0);
    expect(heightOf(empty)).toBeLessThan(heightOf(tallest));
  });

  it('does not draw a returned day below the floor', async () => {
    await wrap(<XpSparkline values={[-20, 10]} />);
    const [returned, earned] = bars();
    expect(heightOf(returned)).toBeGreaterThan(0);
    expect(heightOf(returned)).toBeLessThan(heightOf(earned));
  });

  it('renders nothing at all when there is no window', async () => {
    await wrap(<XpSparkline values={[]} />);
    expect(screen.queryAllByTestId('xp-bar')).toHaveLength(0);
    expect(screen.queryByTestId('xp-sparkline')).toBeNull();
  });

  it('names the day and its XP on every bar, reading the day as local', async () => {
    await wrap(<XpSparkline values={[4, 12]} days={['2026-08-14', '2026-08-15']} />);
    const [, today] = bars();
    expect(today.props.accessibilityLabel).toContain('12 XP');
    // `new Date("2026-08-15")` is UTC midnight, which west of Greenwich is the 14th.
    expect(today.props.accessibilityLabel).toContain('15');
  });

  it('writes the tapped day into the readout and a second tap clears it', async () => {
    await wrap(<XpSparkline values={[4, 12]} />);
    const readout = screen.getByTestId('xp-sparkline-readout');
    expect(readout.props.children).toBe('');

    await act(async () => {
      fireEvent.press(bars()[0]);
    });
    expect(screen.getByTestId('xp-sparkline-readout').props.children).toBe('4 XP');

    await act(async () => {
      fireEvent.press(bars()[1]);
    });
    expect(screen.getByTestId('xp-sparkline-readout').props.children).toBe('12 XP');

    await act(async () => {
      fireEvent.press(bars()[1]);
    });
    expect(screen.getByTestId('xp-sparkline-readout').props.children).toBe('');
  });

  it('describes itself for anyone who cannot see it', async () => {
    await wrap(<XpSparkline values={[1, 2]} summary="Health: XP over the last 2 days" />);
    expect(screen.getByLabelText('Health: XP over the last 2 days')).toBeTruthy();
  });
});
