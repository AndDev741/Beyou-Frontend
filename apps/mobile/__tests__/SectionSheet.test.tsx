/**
 * A folha de seção no desenho do modal da web: nome, horários lado a lado,
 * ícone e — só na criação — a lista de seções favoritas para reaproveitar.
 */
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SectionSheet from '../src/ui/routines/SectionSheet';

const favoriteSection = {
  id: 'fav-1',
  name: 'Manha',
  iconId: 'lucide:sunrise',
  startTime: '06:30',
  endTime: '09:00',
  order: 0,
  favorite: true,
  habitGroup: [{ id: 'hg-1', habitId: 'h1', startTime: '06:40', endTime: '07:00' }],
  taskGroup: [],
};

const routineWithFavorite = {
  id: 'r1',
  name: 'Rotina',
  iconId: '',
  routineSections: [favoriteSection],
} as never;

const wrap = async (node: React.ReactElement, seedFavorites = false) => {
  const store = makeStore();
  if (seedFavorites) store.dispatch(enterRoutines([routineWithFavorite]));
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

test('emits an edited section and blocks when name is empty', async () => {
  const onSave = jest.fn();
  await wrap(<SectionSheet visible section={null} onSave={onSave} onClose={jest.fn()} />);

  // Empty name -> blocked.
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-save'));
  });
  expect(onSave).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.changeText(screen.getByTestId('section-name'), 'Morning');
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-start'));
  });
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  await act(async () => {
    fireEvent(screen.getByTestId('section-start-picker'), 'onChange', { type: 'set' }, d);
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-save'));
  });

  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Morning', startTime: '06:00' }),
  );
});

/** Copiar a favorita é o caminho rápido — com ids novos, senão a edição
 *  escreveria por cima da seção de origem. */
test('copies a favorite section with fresh ids', async () => {
  const onSave = jest.fn();
  const onClose = jest.fn();
  await wrap(<SectionSheet visible section={null} onSave={onSave} onClose={onClose} />, true);

  expect(screen.getByText('Manha')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('use-favorite-fav-1'));
  });

  const copy = onSave.mock.calls[0][0];
  expect(copy.name).toBe('Manha');
  expect(copy.id).not.toBe('fav-1');
  expect(copy.favorite).toBe(false);
  expect(copy.habitGroup[0].id).toBeUndefined();
  expect(copy.habitGroup[0].habitId).toBe('h1');
  expect(onClose).toHaveBeenCalled();
});

/** Editando, trocar a seção por outra não é "editar". */
test('hides the favorites list while editing a section', async () => {
  await wrap(
    <SectionSheet
      visible
      section={{ ...favoriteSection, id: 's-open', name: 'Tarde' }}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />,
    true,
  );

  expect(screen.queryByTestId('use-favorite-fav-1')).toBeNull();
});
