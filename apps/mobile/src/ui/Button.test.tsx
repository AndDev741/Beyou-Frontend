import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from './Button';
import { BeyouThemeProvider } from '../theme/ThemeProvider';

const wrap = async (ui: React.ReactElement) =>
  render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);

describe('Button', () => {
  it('renders text', async () => {
    const { getByText } = await wrap(<Button text="Click me" testID="btn" />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress', async () => {
    const fn = jest.fn();
    const { getByTestId } = await wrap(<Button text="Click me" onPress={fn} testID="btn" />);
    fireEvent.press(getByTestId('btn'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('disabled blocks press', async () => {
    const fn = jest.fn();
    const { getByTestId } = await wrap(
      <Button text="Click me" onPress={fn} disabled testID="btn" />
    );
    fireEvent.press(getByTestId('btn'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('submitting shows ActivityIndicator and blocks press', async () => {
    const fn = jest.fn();
    const { getByTestId, queryByText } = await wrap(
      <Button text="Click me" onPress={fn} submitting testID="btn" />
    );
    expect(getByTestId('btn')).toBeTruthy();
    // ActivityIndicator should be present, text not visible
    expect(queryByText('Click me')).toBeNull();
    fireEvent.press(getByTestId('btn'));
    expect(fn).not.toHaveBeenCalled();
  });
});
