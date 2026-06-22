import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutinesSortSheet from '../src/ui/routines/RoutinesSortSheet';

test('selecting a sort option updates viewFilters.routines', async () => {
  const store = makeStore();
  await render(<Provider store={store}><BeyouThemeProvider><RoutinesSortSheet /></BeyouThemeProvider></Provider>);
  await act(async () => { fireEvent.press(screen.getByTestId('routines-sort')); });
  await act(async () => { fireEvent.press(screen.getByTestId('sort-name-asc')); });
  expect(store.getState().viewFilters.routines).toBe('name-asc');
});
