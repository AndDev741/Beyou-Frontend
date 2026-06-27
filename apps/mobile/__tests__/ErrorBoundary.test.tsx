/**
 * ErrorBoundary — renders children normally; on a child render crash it swaps to a
 * recoverable fallback (translated message + retry) instead of a white screen.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ErrorBoundary from '../src/ui/ErrorBoundary';

const Boom = (): never => {
  throw new Error('boom');
};

const wrap = async (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

test('renders children when there is no error', async () => {
  await wrap(<ErrorBoundary><Text>safe content</Text></ErrorBoundary>);
  expect(screen.getByText('safe content')).toBeTruthy();
});

test('shows the fallback when a child throws', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await wrap(<ErrorBoundary><Boom /></ErrorBoundary>);
  expect(screen.getByTestId('error-boundary')).toBeTruthy();
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  expect(screen.getByTestId('error-retry')).toBeTruthy();
  spy.mockRestore();
});
