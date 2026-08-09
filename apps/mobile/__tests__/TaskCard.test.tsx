/**
 * TaskCard — mirror of the web's taskBox. A task does NOT expand: importance and
 * difficulty already sit on the card, and edit/delete live at the top (on the web
 * they appear on hover; here, always).
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

// Inside `act`: the theme provider settles after the first render, and a loose
// update would corrupt the next test in the file (see AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

describe('TaskCard', () => {
  it('shows everything without an expand step', async () => {
    await wrap(<TaskCard task={task} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('One Time Task')).toBeTruthy();
    expect(screen.getByText('And Marked to Delete')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    // The label rides with the value: "Medium" alone does not say which scale.
    expect(screen.getByText('Importance')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
  });

  it('fires edit and delete from the top row', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('task-edit-t1'));
      fireEvent.press(screen.getByTestId('task-delete-t1'));
    });

    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
