/**
 * useDashboardData (P3-T2) — loads profile + the 5 lists in parallel and
 * dispatches each into its shared @beyou/state slice.
 *
 * Boundary mocked: the @beyou/api HttpClient (via setHttpClient) returns
 * fixtures per URL, so the REAL api functions + REAL slices run end-to-end.
 */
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useDashboardData } from '../src/dashboard/useDashboardData';

const userFixture = {
  name: 'Alice',
  email: 'a@b.com',
  xp: 100,
  level: 3,
  constance: 7,
  widgetsId: ['constance'],
};

const routineFixture = { id: 'r1', name: 'Morning', sections: [] };
const habitFixture = { id: 'h1', name: 'Read' };
const catFixture = { id: 'c1', name: 'Health', xp: 10 };

function installFakeHttp() {
  const get = async (url: string) => {
    switch (url) {
      case '/user':
        return { data: userFixture };
      case '/routine/today':
        return { data: routineFixture };
      case '/habit':
        return { data: [habitFixture] };
      case '/task':
        return { data: [] };
      case '/goal':
        return { data: [] };
      case '/category':
        return { data: [catFixture] };
      default:
        return { data: null };
    }
  };
  const noop = async () => ({ data: null });
  setHttpClient({ get, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
}

function Harness() {
  const { loading, error } = useDashboardData();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="error">{error ?? ''}</Text>
    </>
  );
}

describe('useDashboardData', () => {
  beforeEach(() => {
    installFakeHttp();
  });

  it('loads profile + lists into the shared slices and clears loading', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('error').props.children).toBe('');
    const state = store.getState();
    expect(state.perfil.username).toBe('Alice');
    expect(state.perfil.xp).toBe(100);
    expect(state.perfil.widgetsIdsInUse).toEqual(['constance']);
    expect(state.todayRoutine.routine?.id).toBe('r1');
    expect(state.habits.habits).toHaveLength(1);
    expect(state.categories.categories).toHaveLength(1);
  });
});
