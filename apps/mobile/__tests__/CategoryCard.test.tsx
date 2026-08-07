/**
 * CategoryCard — o cartão compacto do mockup. Fechado mostra ícone, nome,
 * ações, descrição e a barra de XP; expandir revela onde a categoria é usada.
 * Editar e excluir moram no topo (na web aparecem no hover; aqui, sempre).
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategoryCard from '../src/ui/categories/CategoryCard';

const category = {
  id: 'cat1',
  name: 'Health',
  description: 'a long description',
  iconId: 'lucide:heart',
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
  habits: { h1: 'Read' },
} as never;

// Dentro de `act`: o provider de tema assenta depois do primeiro render, e um
// update solto corromperia o próximo teste do arquivo (ver AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

describe('CategoryCard', () => {
  it('shows the level line without expanding', async () => {
    await wrap(<CategoryCard category={category} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('LV 2')).toBeTruthy();
    expect(screen.getByText('50/100')).toBeTruthy();
  });

  it('reveals where the category is used only once expanded', async () => {
    await wrap(<CategoryCard category={category} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('Read')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-expand-cat1'));
    });

    expect(screen.getByText('Using in')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('says what to do when the category is used nowhere', async () => {
    await wrap(
      <CategoryCard
        category={{ ...(category as object), habits: undefined } as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-expand-cat1'));
    });

    expect(screen.getByText('Add this category in a habit, task or goal!')).toBeTruthy();
  });

  it('fires edit and delete from the top row', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<CategoryCard category={category} onEdit={onEdit} onDelete={onDelete} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-edit-cat1'));
      fireEvent.press(screen.getByTestId('category-delete-cat1'));
    });

    expect(onEdit).toHaveBeenCalledWith(category);
    expect(onDelete).toHaveBeenCalledWith(category);
  });
});
