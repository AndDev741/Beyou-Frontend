import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import Input from './Input';
import { BeyouThemeProvider } from '../theme/ThemeProvider';

const wrap = async (ui: React.ReactElement) =>
  render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);

describe('Input', () => {
  it('renders value', async () => {
    const { getByDisplayValue } = await wrap(
      <Input value="hello" onChangeText={jest.fn()} testID="inp" />
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  it('calls onChangeText', async () => {
    const fn = jest.fn();
    const { getByTestId } = await wrap(<Input value="" onChangeText={fn} testID="inp" />);
    fireEvent.changeText(getByTestId('inp'), 'world');
    expect(fn).toHaveBeenCalledWith('world');
  });

  it('password secureTextEntry toggles via eye button', async () => {
    const { getByText, queryByText, getByTestId } = await wrap(
      <Input
        value=""
        onChangeText={jest.fn()}
        password
        eyeOpen={<Text>open</Text>}
        eyeClosed={<Text>closed</Text>}
        testID="inp"
      />
    );
    // Initially hidden (eyeClosed shown)
    expect(getByText('closed')).toBeTruthy();
    expect(queryByText('open')).toBeNull();
    // Press toggle — wrap in act to flush state update
    await act(async () => {
      fireEvent.press(getByTestId('inp-toggle'));
    });
    // Now visible (eyeOpen shown)
    expect(getByText('open')).toBeTruthy();
    expect(queryByText('closed')).toBeNull();
  });

  it('shows error message when error set', async () => {
    const { getByTestId, getByText } = await wrap(
      <Input value="" onChangeText={jest.fn()} error="Required field" testID="inp" />
    );
    expect(getByTestId('inp-error')).toBeTruthy();
    expect(getByText('Required field')).toBeTruthy();
  });
});
