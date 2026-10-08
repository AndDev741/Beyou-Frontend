import Toast from 'react-native-toast-message';
import { notify } from '../src/notify';
import { forgetToast } from '../src/ui/BeyouToast';

/**
 * `skipIfShowing` exists for the rate-limit toast. A dashboard reload is six parallel
 * calls; once the read bucket is dry the server refuses all of them, and each refusal used
 * to re-show the same toast, which reads as the app stuttering rather than as one message.
 */

const show = Toast.show as jest.Mock;

beforeEach(() => {
  forgetToast();
  show.mockClear();
});

it('shows a message once while that same message is still on screen', () => {
  notify.error('Too many requests', { skipIfShowing: true });
  notify.error('Too many requests', { skipIfShowing: true });
  notify.error('Too many requests', { skipIfShowing: true });

  expect(show).toHaveBeenCalledTimes(1);
});

it('still shows a different message', () => {
  notify.error('Too many requests', { skipIfShowing: true });
  notify.error('Something else', { skipIfShowing: true });

  expect(show).toHaveBeenCalledTimes(2);
});

it('shows it again once the first one has gone', () => {
  notify.error('Too many requests', { skipIfShowing: true });
  forgetToast();
  notify.error('Too many requests', { skipIfShowing: true });

  expect(show).toHaveBeenCalledTimes(2);
});

it('leaves every other call as it was', () => {
  notify.error('Saved twice');
  notify.error('Saved twice');

  expect(show).toHaveBeenCalledTimes(2);
});
