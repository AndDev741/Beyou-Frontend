/**
 * NOTIFY — a casca é uma só: borda no tom, ícone (o da entidade quando vem),
 * título, subtítulo opcional, × e o cronômetro de 2px. As chamadas antigas de
 * uma linha herdam tudo isso porque a casca vive no config do <Toast />.
 */
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act } from '@testing-library/react-native';
import type { ToastConfigParams } from 'react-native-toast-message';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { toastConfig, type BeyouToastProps } from '../src/ui/BeyouToast';

const renderToast = async (
  tone: 'success' | 'error' | 'info' | 'warning',
  params: Partial<ToastConfigParams<BeyouToastProps>>,
) => {
  const node = toastConfig[tone]!({
    text1: '',
    text2: undefined,
    props: {},
    ...params,
  } as ToastConfigParams<BeyouToastProps>);

  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

it('shows the title, the subtitle, the close button and the timer', async () => {
  await renderToast('success', { text1: 'Meditar', text2: 'Mais um dia no lugar certo' });

  expect(screen.getByText('Meditar')).toBeTruthy();
  expect(screen.getByText('Mais um dia no lugar certo')).toBeTruthy();
  expect(screen.getByTestId('toast-close')).toBeTruthy();
  expect(screen.getByTestId('toast-timer')).toBeTruthy();
});

it('uses the entity icon when one comes with the call', async () => {
  await renderToast('success', {
    text1: 'Correr',
    props: { icon: <View testID="habit-icon" /> },
  });

  expect(screen.getByTestId('habit-icon')).toBeTruthy();
});

it('carries the tone on the left border', async () => {
  await renderToast('error', { text1: 'Falhou' });

  const card = screen.getByTestId('toast-error');
  const style = Array.isArray(card.props.style) ? Object.assign({}, ...card.props.style) : card.props.style;
  expect(style.borderLeftWidth).toBe(3);
  expect(style.borderLeftColor).toBeTruthy();
});

it('renders a plain one-line call without a subtitle', async () => {
  await renderToast('info', { text1: 'Salvo' });

  // Só o título: uma chamada de uma linha não inventa segunda linha.
  expect(screen.getByTestId('toast-title')).toBeTruthy();
  expect(screen.queryByTestId('toast-subtitle')).toBeNull();
});
