/**
 * TaskForm — create posts the correct DTO (difficulty spelling + categoriesId +
 * oneTimeTask), validation blocks an empty form, edit PUTs. No gamification/
 * experience (cf. HabitForm). Boundary mocked: notify + the @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TaskForm from '../src/ui/tasks/TaskForm';
import { iconRecents } from '../src/ui/icons/iconRecents';
import { notify } from '../src/notify';

const categories = [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }] as never[];
const taskFixture = {
  id: 't1',
  name: 'Email',
  description: 'inbox zero',
  iconId: 'lucide:mail',
  importance: 3,
  difficulty: 2,
  categories: { c1: { name: 'Health', iconId: 'lucide:heart' } },
  oneTimeTask: true,
} as never;

let post: jest.Mock, put: jest.Mock;
beforeEach(() => {
  iconRecents.clearRecentIcons();
  post = jest.fn(async () => ({ data: { success: true } }));
  put = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.success as jest.Mock).mockClear();
  (notify.error as jest.Mock).mockClear();
});

const wrap = (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('TaskForm create', () => {
  it('posts the correct DTO (difficulty + categoriesId + oneTimeTask)', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    await wrap(<TaskForm visible mode="create" categories={categories} onClose={onClose} onSaved={onSaved} />);

    await act(async () => { fireEvent.changeText(screen.getByTestId('task-name'), 'Buy milk'); });

    // Pick an icon through the picker.
    await act(async () => { fireEvent.press(screen.getByTestId('task-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });

    await act(async () => { fireEvent.press(screen.getByTestId('category-c1')); });
    await act(async () => { fireEvent.press(screen.getByText('Low')); });   // importance 1
    await act(async () => { fireEvent.press(screen.getByText('Easy')); });  // difficulty 1
    await act(async () => { fireEvent(screen.getByTestId('task-onetime'), 'valueChange', true); });

    await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/task');
    expect(body).toMatchObject({
      name: 'Buy milk',
      importance: 1,
      difficulty: 1,
      categoriesId: ['c1'],
      oneTimeTask: true,
    });
    expect(body.iconId).toMatch(/^(lucide:|emoji:)/);
    expect(notify.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  }, 20000);

  it('blocks submit when required fields are missing', async () => {
    await wrap(<TaskForm visible mode="create" categories={categories} onClose={jest.fn()} onSaved={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });
    expect(post).not.toHaveBeenCalled();
  });
});

/**
 * "Make it a task" on the Ideas board reuses this form: seeded from the note, and the create goes
 * through the note's own endpoint instead of POST /task.
 */
describe('TaskForm create override', () => {
  it('seeds from initialValues and sends the values to submitCreate instead of POST /task', async () => {
    const submitCreate = jest.fn(async () => ({}));
    const onClose = jest.fn();
    await wrap(
      <TaskForm
        visible
        mode="create"
        categories={categories}
        initialValues={{ name: 'Call the bank', description: 'Card fee' }}
        title="Task from a note"
        createdMessage="Task created. The note moved to Archived."
        submitCreate={submitCreate}
        onClose={onClose}
        onSaved={jest.fn()}
      />,
    );

    expect(screen.getByText('Task from a note')).toBeTruthy();
    expect(screen.getByTestId('task-name').props.value).toBe('Call the bank');
    expect(screen.getByTestId('task-description').props.value).toBe('Card fee');

    await act(async () => { fireEvent.press(screen.getByTestId('task-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
    await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });

    await waitFor(() => expect(submitCreate).toHaveBeenCalledTimes(1));
    expect(submitCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Call the bank', description: 'Card fee' }));
    expect(post).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith('Task created. The note moved to Archived.');
    expect(onClose).toHaveBeenCalled();
  }, 20000);

  it('keeps the form open and says why when the override fails', async () => {
    const submitCreate = jest.fn(async () => ({ error: { errorKey: 'QUICK_NOTE_ALREADY_CONVERTED' } }));
    const onClose = jest.fn();
    await wrap(
      <TaskForm
        visible
        mode="create"
        categories={categories}
        initialValues={{ name: 'Call the bank' }}
        submitCreate={submitCreate}
        onClose={onClose}
        onSaved={jest.fn()}
      />,
    );

    await act(async () => { fireEvent.press(screen.getByTestId('task-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
    await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('This note already became a task.'));
    expect(onClose).not.toHaveBeenCalled();
  }, 20000);
});

describe('TaskForm edit', () => {
  it('seeds from the task and PUTs the update', async () => {
    const onSaved = jest.fn();
    await wrap(<TaskForm visible mode="edit" task={taskFixture} categories={categories} onClose={jest.fn()} onSaved={onSaved} />);

    expect(screen.getByDisplayValue('Email')).toBeTruthy();

    await act(async () => { fireEvent.changeText(screen.getByTestId('task-name'), 'Email everyone'); });
    await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/task');
    expect(body).toMatchObject({ taskId: 't1', name: 'Email everyone', importance: 3, difficulty: 2, oneTimeTask: true, categoriesId: ['c1'] });
    expect(onSaved).toHaveBeenCalled();
  });
});
