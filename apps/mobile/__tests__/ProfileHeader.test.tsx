/**
 * ProfileHeader (P3-T4) — renders greeting+name, level ring and streak from the
 * shared perfil slice (seeded via hydratePerfil).
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

  it('renders the level ring and streak', async () => {
    await renderWithPerfil();
    expect(screen.getByTestId('level-ring')).toBeTruthy();
    expect(screen.getByTestId('streak-badge')).toBeTruthy();
    // level value rendered inside the ring
    expect(screen.getByText('3')).toBeTruthy();
    // constance value
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('falls back to an initial avatar when no photo', async () => {
    await renderWithPerfil({ name: 'Bob', photo: '' });
    expect(screen.getByText('B')).toBeTruthy();
  });
});
