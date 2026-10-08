import type { ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import {
  TOAST_DURATION_MS,
  forgetToast,
  isToastShowing,
  rememberToast,
  type ToastTone,
} from './ui/BeyouToast';

type NotifyOptions = {
  /** Segunda linha: o detalhe, a frase motivacional. */
  subtitle?: string;
  /** The entity's icon — the habit checked, the goal completed. */
  icon?: ReactNode;
  /**
   * Do nothing when the same message is already on screen. For messages that arrive in
   * bursts: a dashboard reload is six parallel calls, and when the rate limit refuses them
   * all, six shows of one toast read as the app stuttering.
   */
  skipIfShowing?: boolean;
};

/**
 * The toast shell lives in the `toastConfig` passed to the layout's `<Toast />`, so
 * the older one-line calls already come out in the new design. The options exist for
 * when the message has an icon of its own or a second line.
 *
 * `rememberToast` records what is on screen so that a modal closing underneath a
 * live toast can hand it to the host below instead of taking it down with the
 * modal's window. See `ModalToastHost`.
 */
const show = (type: ToastTone, message: string, options?: NotifyOptions) => {
  if (options?.skipIfShowing && isToastShowing(type, message)) return;
  const params = {
    type,
    text1: message,
    ...(options?.subtitle ? { text2: options.subtitle } : {}),
    visibilityTime: TOAST_DURATION_MS,
    props: { icon: options?.icon, duration: TOAST_DURATION_MS },
  };

  rememberToast(params, TOAST_DURATION_MS);
  Toast.show({ ...params, onHide: forgetToast });
};

export const notify = {
  success: (message: string, options?: NotifyOptions) => show('success', message, options),
  error: (message: string, options?: NotifyOptions) => show('error', message, options),
  info: (message: string, options?: NotifyOptions) => show('info', message, options),
  warning: (message: string, options?: NotifyOptions) => show('warning', message, options),
};
