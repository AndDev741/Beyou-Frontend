/**
 * The engagement-mail switch on the phone.
 *
 * Same rules as web's NotificationConfiguration, asserted here too rather than assumed:
 * the two screens read the same endpoint but are separate components, and the one that
 * matters most — putting the switch back when the save fails — is exactly the kind of
 * thing that gets written on one platform and forgotten on the other.
 */
// `mock`-prefixed on purpose: jest.mock factories are hoisted above these declarations,
// and jest only permits a factory to reference out-of-scope names that start with "mock".
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockNotifyError = jest.fn();

jest.mock('@beyou/api/notification/notificationPreferences', () => ({
  getNotificationPreferences: () => mockGetPreferences(),
  updateNotificationPreferences: (enabled: boolean) => mockUpdatePreferences(enabled),
}));

jest.mock('@beyou/api/apiError', () => ({
  getFriendlyErrorMessage: () => 'Something went wrong',
}));

jest.mock('../src/notify', () => ({
  notify: { error: (message: string) => mockNotifyError(message), success: jest.fn() },
}));

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import NotificationSection from '../src/ui/config/NotificationSection';

const wrap = async () =>
  render(
    <BeyouThemeProvider>
      <NotificationSection />
    </BeyouThemeProvider>,
  );

const toggle = () => screen.getByTestId('engagement-email-toggle');

describe('NotificationSection', () => {
  beforeEach(() => {
    mockGetPreferences.mockReset();
    mockUpdatePreferences.mockReset();
    mockNotifyError.mockReset();
  });

  it('shows the stored value once loaded', async () => {
    mockGetPreferences.mockResolvedValue({ data: { engagementEmail: true } });

    await wrap();

    await waitFor(() => expect(toggle().props.value).toBe(true));
  });

  it('reflects an account that has opted out', async () => {
    mockGetPreferences.mockResolvedValue({ data: { engagementEmail: false } });

    await wrap();

    await waitFor(() => expect(toggle().props.disabled).toBe(false));
    expect(toggle().props.value).toBe(false);
  });

  it('sends the new value when flipped', async () => {
    mockGetPreferences.mockResolvedValue({ data: { engagementEmail: true } });
    mockUpdatePreferences.mockResolvedValue({ data: { engagementEmail: false } });

    await wrap();
    await waitFor(() => expect(toggle().props.disabled).toBe(false));

    // fireEvent's valueChange, not props.onValueChange: getByTestId returns the host
    // Switch, which forwards the handler natively and does not expose it as a prop.
    await act(async () => {
      fireEvent(toggle(), 'valueChange', false);
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toggle().props.value).toBe(false));
  });

  /**
   * The switch moves before the request answers, so a failure has to move it back.
   * Otherwise the screen claims an opt-out the server never recorded, and the next mail
   * makes the toggle look broken.
   */
  it('puts the switch back when the save fails', async () => {
    mockGetPreferences.mockResolvedValue({ data: { engagementEmail: true } });
    mockUpdatePreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    await wrap();
    await waitFor(() => expect(toggle().props.disabled).toBe(false));

    // fireEvent's valueChange, not props.onValueChange: getByTestId returns the host
    // Switch, which forwards the handler natively and does not expose it as a prop.
    await act(async () => {
      fireEvent(toggle(), 'valueChange', false);
    });

    await waitFor(() => expect(toggle().props.value).toBe(true));
    expect(mockNotifyError).toHaveBeenCalled();
  });

  /**
   * A preference nobody can read is not one anybody should be able to write: a disabled
   * switch cannot send a value derived from a failed load.
   */
  it('stays unavailable when the preference cannot be loaded', async () => {
    mockGetPreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    await wrap();

    await waitFor(() => expect(toggle().props.disabled).toBe(true));
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
  });
});
