/**
 * ConstanceHeatmapWidget — sixteen weeks of days, one column per week and one row
 * per weekday.
 *
 * The layout is hand-rolled: RN has no CSS grid, so the web's column flow becomes
 * an explicit transpose (`cells[column * ROWS + row]`) over a measured cell size.
 * That transpose and that measurement are the whole reason this file exists — they
 * cannot be shared with the web sibling and they have no other cover.
 */
jest.mock('@beyou/api/checkHistory/getCheckHistory', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import getCheckHistory from '@beyou/api/checkHistory/getCheckHistory';
import { timezoneEnter } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ConstanceHeatmapWidget from '../src/ui/widgets/ConstanceHeatmapWidget';

/** A week of days ending on `2026-08-13` (a Thursday), so row placement is checkable. */
const week = [
  { day: '2026-08-09', outcome: 'NOT_SCHEDULED' },
  { day: '2026-08-10', outcome: 'DONE' },
  { day: '2026-08-11', outcome: 'MISSED' },
  { day: '2026-08-12', outcome: 'SKIPPED' },
  { day: '2026-08-13', outcome: 'DONE' },
];

async function renderWidget() {
  const store = makeStore();
  store.dispatch(timezoneEnter('UTC'));

  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <ConstanceHeatmapWidget />
        </BeyouThemeProvider>
      </Provider>,
    );
  });

  // The squares take their side from the measured width; jest computes no layout,
  // so without this the grid renders nothing at all.
  const grid = screen.queryByTestId('constance-heatmap');
  if (grid) {
    await act(async () => {
      fireEvent(grid, 'layout', { nativeEvent: { layout: { width: 320, height: 160 } } });
    });
  }
  return grid;
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-13T12:00:00Z'));
  (getCheckHistory as jest.Mock).mockReset();
  (getCheckHistory as jest.Mock).mockResolvedValue({
    success: {
      ownerType: 'USER',
      ownerId: 'u1',
      from: '2026-08-09',
      to: '2026-08-13',
      days: week,
    },
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ConstanceHeatmapWidget', () => {
  it('asks for sixteen weeks starting on a Sunday', async () => {
    await renderWidget();

    const query = (getCheckHistory as jest.Mock).mock.calls[0][0];
    expect(query.ownerType).toBe('USER');
    expect(query.to).toBe('2026-08-13');
    // 2026-04-26 is a Sunday, sixteen weeks back from the week of the 13th.
    expect(query.from).toBe('2026-04-26');
  });

  it('places each day on its own weekday row and labels it', async () => {
    await renderWidget();

    // 2026-08-11 is a Tuesday; the transpose must not shuffle it.
    expect(screen.getByLabelText(/2026-08-11 · Missed/)).toBeTruthy();
    expect(screen.getByLabelText(/2026-08-13 · Done/)).toBeTruthy();
    expect(screen.getByLabelText(/2026-08-09 · Not on your schedule/)).toBeTruthy();
  });

  it('carries the legend, because colour is the only thing encoding the outcome', async () => {
    await renderWidget();

    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(screen.getByText('Missed')).toBeTruthy();
    expect(screen.getByText('No activity')).toBeTruthy();
  });

  it('draws no grid at all when the history came back empty', async () => {
    // The failure this guards: with no days, the column count collapses to one and
    // every square takes the full measured width — seven stacked blocks roughly as
    // tall as the widget is wide. The web sibling renders nothing, which is right.
    (getCheckHistory as jest.Mock).mockResolvedValue({
      success: { ownerType: 'USER', ownerId: 'u1', from: '2026-04-26', to: '2026-08-13', days: [] },
    });

    const grid = await renderWidget();

    expect(grid).toBeTruthy();
    // Rows, not labels: the squares this used to paint carried no label at all, so
    // only counting the grid's children catches them.
    expect(grid?.children ?? []).toHaveLength(0);
    expect(screen.getByText(/16 weeks/)).toBeTruthy();
  });

  it('says the history is unavailable instead of drawing an empty grid as failure', async () => {
    (getCheckHistory as jest.Mock).mockResolvedValue({ error: 'UnexpectedError' });

    await renderWidget();

    expect(screen.getByText('History unavailable right now')).toBeTruthy();
    expect(screen.queryByText('Done')).toBeNull();
  });
});
