/**
 * HabitCard — espelho do habitBox da web. Editar e excluir ficam SEMPRE
 * visíveis no topo (a web os revela no hover, que não existe aqui); expandir
 * solta o clamp e mostra rotinas, frase, atributos e os números.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import HabitCard from '../src/ui/habits/HabitCard';

const habit = {
  id: 'h1',
  name: 'Read',
  description: 'a long description',
  motivationalPhrase: 'keep growing',
  iconId: 'lucide:book',
  categories: [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }],
  importance: 3,
  dificulty: 2,
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
  constance: 4,
  routines: { r1: 'Morning Routine' },
} as never;

// Dentro de `act`: o provider de tema assenta depois do primeiro render, e um
// update solto corromperia o próximo teste do arquivo (ver AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

describe('HabitCard', () => {
  it('keeps edit and delete reachable without expanding', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<HabitCard habit={habit} onEdit={onEdit} onDelete={onDelete} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-edit-h1'));
      fireEvent.press(screen.getByTestId('habit-delete-h1'));
    });

    expect(onEdit).toHaveBeenCalledWith(habit);
    expect(onDelete).toHaveBeenCalledWith(habit);
  });

  it('hides the details until it is expanded', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('keep growing')).toBeNull();
    expect(screen.queryByText('Morning Routine')).toBeNull();
    // A categoria fica no cartão fechado — é o que separa um hábito do outro.
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('expands into routines, phrase and labelled attributes', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    expect(screen.getByText('keep growing')).toBeTruthy();
    expect(screen.getByText('Morning Routine')).toBeTruthy();
    // O rótulo acompanha o valor: "Média" sozinho não diz de que escala é.
    expect(screen.getByText('Importance')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
  });

  it('collapses again from the chevron', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-expand-h1'));
    });
    expect(screen.getByText('keep growing')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-expand-h1'));
    });
    expect(screen.queryByText('keep growing')).toBeNull();
  });
});
