/**
 * Deleting an account is three deliberate steps on purpose: say it out loud, prove
 * the inbox is yours, and then say goodbye. Nothing may reach the delete call
 * before all three.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

jest.mock('@beyou/api/user/requestAccountDeletionCode', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@beyou/api/user/deleteAccount', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import '../src/i18n';
import requestAccountDeletionCode from '@beyou/api/user/requestAccountDeletionCode';
import deleteAccount from '@beyou/api/user/deleteAccount';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DeleteAccountSheet from '../src/ui/config/DeleteAccountSheet';

const askForCode = requestAccountDeletionCode as jest.Mock;
const confirmDeletion = deleteAccount as jest.Mock;

beforeEach(() => {
  askForCode.mockReset().mockResolvedValue({ success: true });
  confirmDeletion.mockReset().mockResolvedValue({ success: true });
});

const wrap = async () => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <DeleteAccountSheet visible onClose={jest.fn()} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

describe('DeleteAccountSheet', () => {
  it('asks for a code only after the first confirmation', async () => {
    await wrap();

    expect(askForCode).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });

    await waitFor(() => expect(askForCode).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('delete-account-code')).toBeTruthy();
  });

  it('holds the delete until the goodbye step, then spends the code', async () => {
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-code'), '123456');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-code-continue'));
    });

    // The goodbye screen comes first, and nothing has been deleted yet.
    expect(screen.getByTestId('delete-account-final')).toBeTruthy();
    expect(confirmDeletion).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-final'));
    });

    await waitFor(() => expect(confirmDeletion).toHaveBeenCalledWith('123456'));
  });

  it('sends a wrong code back to the code step instead of leaving the user stuck', async () => {
    confirmDeletion.mockResolvedValueOnce({ error: { errorKey: 'DELETION_CODE_INVALID' } });
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-code'), '000000');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-code-continue'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-final'));
    });

    await waitFor(() => expect(screen.getByTestId('delete-account-code')).toBeTruthy());
  });

  it('keeps a half-typed code out of the delete call', async () => {
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-code'), '12');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-code-continue'));
    });

    expect(screen.queryByTestId('delete-account-final')).toBeNull();
    expect(confirmDeletion).not.toHaveBeenCalled();
  });
});
