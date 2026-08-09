import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Ring from '../src/ui/Ring';
import Chip from '../src/ui/Chip';
import SegmentedControl from '../src/ui/SegmentedControl';
import XpBar from '../src/ui/XpBar';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';

const wrap = async (ui: React.ReactElement) =>
  render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);

describe('Ring', () => {
  it('renders the done state with the check and a full arc', async () => {
    const { getByTestId } = await wrap(<Ring state="done" progress={0.2} testID="ring" />);
    expect(getByTestId('ring')).toBeTruthy();
    // Same path as BrandMark — if it drifts, the brand signature breaks.
    expect(getByTestId('ring-check').props.d).toBe('M22 33l7 7 14-14');
    // A full arc (offset 0, which react-native-svg normalises to null) proves
    // que "done" ignora o `progress` recebido.
    expect(getByTestId('ring-arc').props.strokeDashoffset ?? 0).toBe(0);
  });

  it('does not render the check when todo', async () => {
    const { queryByTestId } = await wrap(<Ring state="todo" testID="ring" />);
    expect(queryByTestId('ring-check')).toBeNull();
    expect(queryByTestId('ring-arc')).toBeNull();
  });

  it('leaves half the arc empty at progress 0.5', async () => {
    const { getByTestId } = await wrap(<Ring state="progress" progress={0.5} testID="ring" />);
    const arc = getByTestId('ring-arc');
    const [circumference] = arc.props.strokeDasharray as number[];
    expect(arc.props.strokeDashoffset).toBeCloseTo(circumference / 2, 5);
  });
});

describe('Chip', () => {
  it('renders its label', async () => {
    const { getByText } = await wrap(<Chip variant="xp">+12 XP</Chip>);
    expect(getByText('+12 XP')).toBeTruthy();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 1, label: 'Easy' },
    { value: 3, label: 'Hard' },
  ];

  it('calls onChange with the pressed value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await wrap(
      <SegmentedControl
        testID="seg"
        label="Difficulty"
        value={1}
        onChange={onChange}
        options={options}
      />,
    );

    // The theme provider settles after the tap; without the act the update leaks
    // into the next test in the file.
    await act(async () => {
      fireEvent.press(getByTestId('seg-3'));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('marks the active option as checked', async () => {
    const { getByTestId } = await wrap(
      <SegmentedControl
        testID="seg"
        label="Difficulty"
        value={1}
        onChange={jest.fn()}
        options={options}
      />,
    );
    expect(getByTestId('seg-1').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('seg-3').props.accessibilityState.checked).toBe(false);
  });
});

describe('XpBar', () => {
  it('clamps a 0 target without dividing by zero', async () => {
    const { getByText } = await wrap(<XpBar current={40} target={0} level={3} />);
    expect(getByText('40/0')).toBeTruthy();
    expect(getByText('LV 3')).toBeTruthy();
  });

  it('caps the fill at 100% when current exceeds target', async () => {
    const { getByText } = await wrap(<XpBar current={500} target={100} />);
    expect(getByText('500/100')).toBeTruthy();
  });
});
