/**
 * A resposta de um formulário de autenticação, agora uma só peça. Antes cada
 * tela desenhava a sua: caixa de borda dupla no registro, ícone de 48px na
 * recuperação, parágrafo solto no login.
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

/** Erro interrompe o leitor de tela; o resto espera a vez. */
it('announces an error assertively and the other tones politely', async () => {
  await renderIt(<FormNotice tone="error" message="boom" testID="error-notice" />);
  expect(screen.getByTestId('error-notice').props.accessibilityLiveRegion).toBe('assertive');

  await renderIt(<FormNotice tone="loading" message="checking" testID="loading-notice" />);
  expect(screen.getByTestId('loading-notice').props.accessibilityLiveRegion).toBe('polite');
});
