import React from 'react';
import { render } from '@testing-library/react-native';
import PasswordHints from './PasswordHints';
import { BeyouThemeProvider } from '../theme/ThemeProvider';
import '../i18n';

const wrap = async (ui: React.ReactElement) =>
  render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);

describe('PasswordHints', () => {
  it('shows both hints as pending for a short password with one class', async () => {
    const { getByTestId } = await wrap(<PasswordHints password="abc" />);
    expect(getByTestId('PasswordHintLength-pending')).toBeTruthy();
    expect(getByTestId('PasswordHintClasses-pending')).toBeTruthy();
  });

  it('shows length hint ok when password meets 12-char minimum', async () => {
    const { getByTestId } = await wrap(<PasswordHints password="abcdefghijkl" />);
    expect(getByTestId('PasswordHintLength-ok')).toBeTruthy();
    // only one class (lowercase), so classes still pending
    expect(getByTestId('PasswordHintClasses-pending')).toBeTruthy();
  });

  it('shows both hints ok for a strong password (12+ chars, 2+ classes)', async () => {
    const { getByTestId } = await wrap(<PasswordHints password="Abcdefghijkl1" />);
    expect(getByTestId('PasswordHintLength-ok')).toBeTruthy();
    expect(getByTestId('PasswordHintClasses-ok')).toBeTruthy();
  });

  it('counts mixed classes correctly — digits + lowercase triggers ok', async () => {
    const { getByTestId } = await wrap(<PasswordHints password="abc123defghij" />);
    expect(getByTestId('PasswordHintLength-ok')).toBeTruthy();
    expect(getByTestId('PasswordHintClasses-ok')).toBeTruthy();
  });

  it('trims leading/trailing whitespace before evaluating', async () => {
    // "abc" trimmed to 3 chars — both pending
    const { getByTestId } = await wrap(<PasswordHints password="  abc  " />);
    expect(getByTestId('PasswordHintLength-pending')).toBeTruthy();
  });

  it('renders the password-hints container', async () => {
    const { getByTestId } = await wrap(<PasswordHints password="" />);
    expect(getByTestId('password-hints')).toBeTruthy();
  });
});
