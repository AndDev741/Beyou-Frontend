import type { ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import { TOAST_DURATION_MS, type ToastTone } from './ui/BeyouToast';

type NotifyOptions = {
  /** Segunda linha: o detalhe, a frase motivacional. */
  subtitle?: string;
  /** Ícone da entidade — o hábito marcado, a meta concluída. */
  icon?: ReactNode;
};

/**
 * A casca do toast vive no `toastConfig` passado ao `<Toast />` do layout, então
 * as chamadas antigas de uma linha já saem no desenho novo. As opções existem
 * para quando a mensagem tem ícone próprio ou segunda linha.
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
