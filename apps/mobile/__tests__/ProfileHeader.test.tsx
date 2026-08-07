/**
 * ProfileHeader — saudação, data por extenso, frase e a pílula de sequência,
 * lidas da slice de perfil. Sem avatar e sem anel de nível: quem você é já está
 * na configuração e o nível tem widget próprio (mesma decisão da web).
 */
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ProfileHeader from '../src/ui/dashboard/ProfileHeader';

async function renderWithPerfil(over: Record<string, unknown> = {}) {
  const store = makeStore();
  store.dispatch(
    hydratePerfil({
      name: 'Alice',
      constance: 7,
      xp: 100,
      level: 3,
      actualLevelXp: 80,
      nextLevelXp: 120,
      ...over,
    }),
  );
  await render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ProfileHeader />
      </BeyouThemeProvider>
    </Provider>,
  );
  return store;
}

describe('ProfileHeader', () => {
  it('shows the greeting with the user name', async () => {
    await renderWithPerfil();
    expect(screen.getByTestId('dashboard-greeting').props.children).toContain('Alice');
  });

  it('shows the streak as a chip', async () => {
    await renderWithPerfil();
    expect(screen.getByText(/^7 /)).toBeTruthy();
  });

  it('leaves out the avatar and the level ring', async () => {
    await renderWithPerfil({ name: 'Bob', photo: '' });
    expect(screen.queryByTestId('level-ring')).toBeNull();
    expect(screen.queryByText('B')).toBeNull();
  });

  it('hides the streak chip at zero — an unlit flame reads as failure', async () => {
    await renderWithPerfil({ constance: 0 });
    expect(screen.queryByText(/^0 /)).toBeNull();
  });

  it('carries the phrase and its author', async () => {
    await renderWithPerfil({ phrase: 'Keep going', phrase_author: 'Dad' });
    expect(screen.getByText(/Keep going/)).toBeTruthy();
    expect(screen.getByText(/Dad/)).toBeTruthy();
  });
});
