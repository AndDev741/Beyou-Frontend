/**
 * TaskCard — collapsed shows name/desc + one-time badge; tapping expands to reveal
 * categories + importance/difficulty + Edit/Delete, which fire their callbacks.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TaskCard from '../src/ui/tasks/TaskCard';

const task = {
  id: 't1',
  name: 'Email',
  description: 'a long description',
  iconId: 'lucide:mail',
  categories: { c1: { name: 'Health', iconId: 'lucide:heart' } },
  importance: 3,
  difficulty: 2,
  oneTimeTask: true,
  markedToDelete: new Date(),
} as never;

const wrap = (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('TaskCard', () => {
  it('shows one-time + marked-to-delete, expands to details, fires edit/delete', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />);

    // Always-visible one-time badge + marked-to-delete note.
    expect(screen.getByText('One Time Task')).toBeTruthy();
    expect(screen.getByText('And Marked to Delete')).toBeTruthy();
    // Collapsed: no edit/delete yet.
    expect(screen.queryByTestId('task-edit-t1')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByTestId('task-card-t1')); });

    expect(screen.getByText('High')).toBeTruthy();   // importance 3
    expect(screen.getByText('Normal')).toBeTruthy(); // difficulty 2

    await act(async () => { fireEvent.press(screen.getByTestId('task-edit-t1')); });
    expect(onEdit).toHaveBeenCalledWith(task);
    await act(async () => { fireEvent.press(screen.getByTestId('task-delete-t1')); });
    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
