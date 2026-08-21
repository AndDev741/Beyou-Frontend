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

const wrap = async (onClose: () => void = jest.fn()) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <DeleteAccountSheet visible onClose={onClose} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

/** Walks to the goodbye screen with a valid-looking code already typed. */
const walkToGoodbye = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-account-continue'));
  });
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('delete-account-code'), '123456');
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-account-code-continue'));
  });
};

describe('DeleteAccountSheet', () => {
  /**
   * The way out has to stay on the screen. "Delete my account forever" is a whole
   * sentence, and while it shared a row with Cancel it grew wider than the dialog
   * and pushed Cancel off the left edge, leaving the irreversible button as the
   * only one a phone could show. Each of these taking its own full-width row is
   * what makes that impossible, and NativeWind does not compile classes under
   * jest, so the class is what there is to assert.
   */
  it('gives each button on the goodbye step its own full-width row', async () => {
    await wrap();
    await walkToGoodbye();

    expect(screen.getByTestId('delete-account-final').props.className).toContain('w-full');
    expect(screen.getByTestId('delete-account-final-cancel').props.className).toContain('w-full');
  });

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

  /**
   * The failure that is not about the code.
   *
   * A phone that lost signal, or an OS that killed the request when the app went to
   * the background, produces a generic error that says nothing about whether the
   * account survived. Treating it like a wrong code asks the user to delete an
   * account that may already be gone, on a device still holding all of its data.
   */
  it('leaves when the failure is not about the code, instead of asking for it again', async () => {
    confirmDeletion.mockResolvedValueOnce({ error: { errorKey: 'UnexpectedError' } });
    const onClose = jest.fn();
    await wrap(onClose);

    await walkToGoodbye();
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-final'));
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByTestId('delete-account-code')).toBeNull();
  });

  /**
   * Ask for a code, close the sheet to go read the email, come straight back: the
   * second request is refused for the cooldown while a perfectly valid code sits in
   * the inbox. Stopping at step one leaves nowhere to type it.
   */
  it('still opens the code step when a code was already sent moments ago', async () => {
    askForCode.mockResolvedValueOnce({ error: { errorKey: 'DELETION_CODE_TOO_MANY_REQUESTS' } });
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });

    await waitFor(() => expect(screen.getByTestId('delete-account-code')).toBeTruthy());
  });

  it('stops at step one when the code could not be sent for any other reason', async () => {
    askForCode.mockResolvedValueOnce({ error: { errorKey: 'UnexpectedError' } });
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });

    await waitFor(() => expect(askForCode).toHaveBeenCalled());
    expect(screen.queryByTestId('delete-account-code')).toBeNull();
    expect(screen.getByTestId('delete-account-continue')).toBeTruthy();
  });

  /** A new code kills the old one, so the digits still on screen are dead. */
  it('empties the field when a new code is sent', async () => {
    await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-continue'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-code'), '123456');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-resend'));
    });

    await waitFor(() => expect(askForCode).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('delete-account-code').props.value).toBe('');
    // And the way forward is closed again until six fresh digits arrive.
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-code-continue'));
    });
    expect(screen.queryByTestId('delete-account-final')).toBeNull();
  });

  /**
   * The opposite of an unclear failure, and it was treated as one.
   *
   * ACCOUNT_DELETE_FAILED means the deletion rolled back: the account is intact, the
   * code was never spent, the session is still good. Leaving here is worse on a phone
   * than on the web, because leave() dispatches logout, which revokes the refresh
   * token server-side. The app would sign someone out of a live account.
   */
  it('stays put when the deletion failed and the account is still there', async () => {
    confirmDeletion.mockResolvedValueOnce({ error: { errorKey: 'ACCOUNT_DELETE_FAILED' } });
    const onClose = jest.fn();
    await wrap(onClose);

    await walkToGoodbye();
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-final'));
    });

    expect(onClose).not.toHaveBeenCalled();
    // Still on the goodbye step, and the code was not spent, so pressing again is the
    // whole recovery.
    expect(screen.getByTestId('delete-account-final')).toBeTruthy();
    expect(screen.queryByTestId('delete-account-code')).toBeNull();
  });

  /**
   * Cancel and Android's hardware back both run through onClose, and neither can call
   * back a request that is already out. Whoever wires onClose straight to the Modal
   * again reopens the hole, so this is the guard.
   */
  it('cannot be dismissed while the delete is in flight', async () => {
    let finish: (value: unknown) => void = () => {};
    confirmDeletion.mockReturnValueOnce(new Promise((resolve) => {
      finish = resolve;
    }));
    const onClose = jest.fn();
    await wrap(onClose);

    await walkToGoodbye();
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-final'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Cancel'));
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      finish({ success: true });
    });
  });
});
