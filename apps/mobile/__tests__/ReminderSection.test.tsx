/**
 * Calendar reminders in the phone's settings (R12, R13): the missed-reminder email switch and
 * the default reminder time. Each control sends ONLY its own field, because the PUT is partial
 * and the engagement switch above it saves through the same endpoint: a body carrying a stale
 * `engagementEmail` would quietly undo the other control. Optimistic, reverting on failure.
 */
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockNotifyError = jest.fn();

jest.mock('@beyou/api/notification/notificationPreferences', () => ({
  getNotificationPreferences: () => mockGetPreferences(),
  updateNotificationPreferences: (patch: unknown) => mockUpdatePreferences(patch),
}));
jest.mock('@beyou/api/apiError', () => ({
  getFriendlyErrorMessage: () => 'Something went wrong',
}));
jest.mock('../src/notify', () => ({
  notify: { error: (message: string) => mockNotifyError(message), success: jest.fn() },
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ReminderSection from '../src/ui/config/ReminderSection';

const LOADED = { engagementEmail: true, reminderEmail: true, reminderWeb: true, reminderDefaultTime: '09:00' };

const wrap = async () => {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <ReminderSection />
      </BeyouThemeProvider>,
    );
  });
};

const emailSwitch = () => screen.getByTestId('reminder-email-toggle');

async function pickTime(hours: number, minutes: number) {
  await act(async () => {
    fireEvent.press(screen.getByTestId('reminder-default-time'));
  });
  const picked = new Date();
  picked.setHours(hours, minutes, 0, 0);
  await act(async () => {
    fireEvent(screen.getByTestId('reminder-default-time-picker'), 'onChange', { type: 'set' }, picked);
  });
}

describe('ReminderSection', () => {
  beforeEach(() => {
    mockGetPreferences.mockReset();
    mockUpdatePreferences.mockReset();
    mockNotifyError.mockReset();
  });

  it('shows the stored values once loaded', async () => {
    mockGetPreferences.mockResolvedValue({ data: { ...LOADED, reminderEmail: false, reminderDefaultTime: '07:15' } });

    await wrap();

    await waitFor(() => expect(emailSwitch().props.disabled).toBe(false));
    expect(emailSwitch().props.value).toBe(false);
    expect(screen.getByText('07:15')).toBeTruthy();
  });

  it('flipping the email switch sends that field and nothing else', async () => {
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    mockUpdatePreferences.mockResolvedValue({ data: { ...LOADED, reminderEmail: false } });
    await wrap();
    await waitFor(() => expect(emailSwitch().props.disabled).toBe(false));

    await act(async () => {
      fireEvent(emailSwitch(), 'valueChange', false);
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ reminderEmail: false });
    await waitFor(() => expect(emailSwitch().props.value).toBe(false));
  });

  it('puts the switch back when the save fails', async () => {
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    mockUpdatePreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
    await wrap();
    await waitFor(() => expect(emailSwitch().props.disabled).toBe(false));

    await act(async () => {
      fireEvent(emailSwitch(), 'valueChange', false);
    });

    await waitFor(() => expect(emailSwitch().props.value).toBe(true));
    expect(mockNotifyError).toHaveBeenCalled();
  });

  it('a new default time sends that field and nothing else', async () => {
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    mockUpdatePreferences.mockResolvedValue({ data: { ...LOADED, reminderDefaultTime: '07:30' } });
    await wrap();
    await waitFor(() => expect(screen.getByTestId('reminder-default-time')).toBeTruthy());

    await pickTime(7, 30);

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ reminderDefaultTime: '07:30' });
    expect(screen.getByText('07:30')).toBeTruthy();
  });

  it('puts the old time back when that save fails', async () => {
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    mockUpdatePreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
    await wrap();
    await waitFor(() => expect(screen.getByTestId('reminder-default-time')).toBeTruthy());

    await pickTime(7, 30);

    await waitFor(() => expect(screen.getByText('09:00')).toBeTruthy());
    expect(screen.queryByText('07:30')).toBeNull();
    expect(mockNotifyError).toHaveBeenCalled();
  });

  /**
   * Two saves in flight at once each captured their own "before", so the one that failed put back
   * a picture that no longer matched, and the other field changed on screen with it. Saves go one
   * at a time: while the switch is saving, the time cannot be changed, and a failure puts back
   * only the switch.
   */
  it('saves one thing at a time and a failure puts back only that thing', async () => {
    let finish: (value: unknown) => void = () => {};
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    mockUpdatePreferences.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await wrap();
    await waitFor(() => expect(emailSwitch().props.disabled).toBe(false));

    await act(async () => {
      fireEvent(emailSwitch(), 'valueChange', false);
    });

    expect(screen.getByTestId('reminder-default-time').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('reminder-default-time'));
    });
    expect(screen.queryByTestId('reminder-default-time-picker')).toBeNull();
    expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ error: { errorKey: 'UnexpectedError' } });
    });

    await waitFor(() => expect(emailSwitch().props.value).toBe(true));
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getByTestId('reminder-default-time').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('stays unavailable when the preferences cannot be loaded', async () => {
    mockGetPreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    await wrap();

    await waitFor(() => expect(emailSwitch().props.disabled).toBe(true));
    expect(screen.queryByTestId('reminder-default-time')).toBeNull();
    expect(screen.getByTestId('reminder-default-time-unavailable')).toBeTruthy();
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
  });

  it('offers no notification switch on the phone', async () => {
    mockGetPreferences.mockResolvedValue({ data: LOADED });
    await wrap();

    expect(screen.queryByTestId('reminder-web-toggle')).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });
});
