import type { ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import { TOAST_DURATION_MS, type ToastTone } from './ui/BeyouToast';

type NotifyOptions = {
  /** Segunda linha: o detalhe, a frase motivacional. */
  subtitle?: string;
  /** The entity's icon — the habit checked, the goal completed. */
  icon?: ReactNode;
};

/**
 * The toast shell lives in the `toastConfig` passed to the layout's `<Toast />`, so
 * the older one-line calls already come out in the new design. The options exist for
 * when the message has an icon of its own or a second line.
 */
const show = (type: ToastTone, message: string, options?: NotifyOptions) =>
  Toast.show({
    type,
    text1: message,
    ...(options?.subtitle ? { text2: options.subtitle } : {}),
    visibilityTime: TOAST_DURATION_MS,
    props: { icon: options?.icon, duration: TOAST_DURATION_MS },
  });

export const notify = {
  success: (message: string, options?: NotifyOptions) => show('success', message, options),
  error: (message: string, options?: NotifyOptions) => show('error', message, options),
  info: (message: string, options?: NotifyOptions) => show('info', message, options),
  warning: (message: string, options?: NotifyOptions) => show('warning', message, options),
};
