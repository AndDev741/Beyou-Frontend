/**
 * An auth form's answer, now a single piece. Every screen used to draw its own: a
 * double-bordered box on register, a 48px icon on recovery, a loose paragraph on
 * login.
 */
import { Provider } from 'react-redux';
import { render, screen, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import FormNotice from '../src/ui/auth/FormNotice';

const renderIt = async (node: React.ReactNode) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

it('shows the title and the message', async () => {
  await renderIt(
    <FormNotice tone="success" title="Check your inbox" message="We sent a link" testID="notice" />,
  );

  expect(screen.getByTestId('notice')).toBeTruthy();
  expect(screen.getByText('Check your inbox')).toBeTruthy();
  expect(screen.getByText('We sent a link')).toBeTruthy();
});

it('works without a title', async () => {
  await renderIt(<FormNotice tone="error" message="That link is invalid" testID="notice" />);

  expect(screen.getByText('That link is invalid')).toBeTruthy();
});

/** An error interrupts the screen reader; everything else waits its turn. */
it('announces an error assertively and the other tones politely', async () => {
  await renderIt(<FormNotice tone="error" message="boom" testID="error-notice" />);
  expect(screen.getByTestId('error-notice').props.accessibilityLiveRegion).toBe('assertive');

  await renderIt(<FormNotice tone="loading" message="checking" testID="loading-notice" />);
  expect(screen.getByTestId('loading-notice').props.accessibilityLiveRegion).toBe('polite');
});
