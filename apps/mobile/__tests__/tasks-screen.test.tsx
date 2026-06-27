/**
 * Tasks screen — self-fetches tasks + categories, renders cards from the slice,
 * shows the empty state when none, exposes a sort control, and deletes (Alert
 * confirm → deleteTask → refetch). Boundary mocked = @beyou/api HttpClient +
 * expo-router + notify + RN Alert.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TasksScreen from '../app/(app)/tasks';

const task = {
  id: 't1',
  name: 'Email',
  description: 'inbox',
  iconId: 'lucide:mail',
  categories: { c1: { name: 'Health', iconId: 'lucide:heart' } },
  importance: 3,
  difficulty: 2,
  oneTimeTask: false,
};

let del: jest.Mock;
function setHttp(tasks: unknown[]) {
  const get = async (url: string) => (url === '/task' ? { data: tasks } : { data: [] });
  del = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get, post: get, put: get, delete: del } as never);
  setLogger({ error: () => {} });
}

const renderScreen = () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <TasksScreen />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('TasksScreen', () => {
  it('renders fetched tasks as cards + a sort control', async () => {
    setHttp([task]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('task-card-t1')).toBeTruthy());
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByTestId('tasks-sort')).toBeTruthy();
  });

  it('shows the empty state when there are no tasks', async () => {
    setHttp([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No tasks yet')).toBeTruthy());
    expect(screen.getByTestId('empty-create-task')).toBeTruthy();
    expect(screen.queryByTestId('tasks-sort')).toBeNull();
  });

  it('deletes a task after Alert confirmation', async () => {
    setHttp([task]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('task-card-t1')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByTestId('task-card-t1')); }); // expand
    await act(async () => { fireEvent.press(screen.getByTestId('task-delete-t1')); });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/task/t1'));
    alertSpy.mockRestore();
  });
});
