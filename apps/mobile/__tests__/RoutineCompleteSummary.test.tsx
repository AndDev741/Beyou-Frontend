/** RoutineCompleteSummary (P3-T6) — shows only when every item is checked. */
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react-native';
import {
  hydratePerfil,
  checkedItemsInScheduledRoutineEnter,
  totalItemsInScheduledRoutineEnter,
} from '@beyou/state/user/perfilSlice';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineCompleteSummary from '../src/ui/dashboard/RoutineCompleteSummary';

const today = new Date().toJSON().slice(0, 10);

function seed(checked: number, total: number) {
  const store = makeStore();
  store.dispatch(hydratePerfil({ constance: 5 }));
  store.dispatch(checkedItemsInScheduledRoutineEnter(checked));
  store.dispatch(totalItemsInScheduledRoutineEnter(total));
  store.dispatch(
    enterTodayRoutine({
      id: 'r1',
      name: 'R',
      iconId: '',
      routineSections: [
        {
          id: 's1',
          name: 'S',
          iconId: '',
          startTime: '06:00',
          endTime: '07:00',
          order: 0,
          taskGroup: [],
          habitGroup: [
            {
              id: 'hg1',
              habitId: 'h1',
              startTime: '06:00',
              habitGroupChecks: [
                { id: 'k1', checkDate: today, checkTime: '06:05', checked: true, skipped: false, xpGenerated: 50 },
              ],
            },
          ],
        },
      ],
    } as never),
  );
  return store;
}

const renderSummary = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <RoutineCompleteSummary />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('RoutineCompleteSummary', () => {
  it('renders nothing while items remain unchecked', async () => {
    await renderSummary(seed(1, 2));
    expect(screen.queryByTestId('routine-complete-summary')).toBeNull();
  });

  it('shows the summary once everything is checked', async () => {
    await renderSummary(seed(2, 2));
    expect(screen.getByTestId('routine-complete-summary')).toBeTruthy();
  });
});
