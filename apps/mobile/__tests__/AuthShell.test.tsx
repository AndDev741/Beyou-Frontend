/**
 * A casca das telas de autenticação. Substitui as antigas AuthTabs +
 * MobileBrand: a marca é o cabeçalho, a troca de tela é um link no rodapé, e o
 * título só aparece quando a tela pede (login e registro não pedem).
 */
import { Provider } from 'react-redux';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AuthShell from '../src/ui/auth/AuthShell';

const renderIt = async (node: React.ReactNode) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

it('puts the brand at the top of every auth screen', async () => {
  await renderIt(
    <AuthShell testID="shell">
      <Text>form</Text>
    </AuthShell>,
  );

  expect(screen.getByTestId('shell')).toBeTruthy();
  expect(screen.getByText('beyou')).toBeTruthy();
  expect(screen.getByLabelText('beyou')).toBeTruthy();
  expect(screen.getByText('form')).toBeTruthy();
});

it('leaves out the title when the screen does not pass one', async () => {
  await renderIt(
    <AuthShell subtitle="sub">
      <Text>form</Text>
    </AuthShell>,
  );

  expect(screen.queryByText('Reset your password')).toBeNull();
  expect(screen.getByText('sub')).toBeTruthy();
});

it('renders the title and the footer when asked', async () => {
  await renderIt(
    <AuthShell title="Forgot your password?" footer={<Text>Back to login</Text>}>
      <Text>form</Text>
    </AuthShell>,
  );

  expect(screen.getByText('Forgot your password?')).toBeTruthy();
  expect(screen.getByText('Back to login')).toBeTruthy();
});
