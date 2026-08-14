/**
 * ConstanceWidget — the streak number, the record, and the last 28 days as they
 * really went. The strip used to be derived from the number itself; it now comes
 * from GET /check-history.
 */
jest.mock('@beyou/api/checkHistory/getCheckHistory', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import getCheckHistory from '@beyou/api/checkHistory/getCheckHistory';
import { constanceEnter, constanceDormantEnter, maxConstanceEnter } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ConstanceWidget from '../src/ui/widgets/ConstanceWidget';

const days = (outcomes: string[]) =>
  outcomes.map((outcome, index) => ({
    day: `2026-08-${String(index + 1).padStart(2, '0')}`,
    outcome,
  }));

async function renderWidget(constance: number, options: { dormant?: boolean; best?: number } = {}) {
  const store = makeStore();
  store.dispatch(constanceEnter(constance));
  store.dispatch(maxConstanceEnter(options.best ?? 21));
  if (options.dormant) store.dispatch(constanceDormantEnter(true));

  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <ConstanceWidget constance={constance} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });

  // The squares take their side from the measured width; jest computes no layout.
  const strip = screen.queryByTestId('streak-strip');
  if (strip) {
    await act(async () => {
      fireEvent(strip, 'layout', { nativeEvent: { layout: { width: 300, height: 40 } } });
    });
  }
}

beforeEach(() => {
  (getCheckHistory as jest.Mock).mockReset();
  (getCheckHistory as jest.Mock).mockResolvedValue({
    success: {
      ownerType: 'USER',
      ownerId: 'u1',
      from: '2026-08-01',
      to: '2026-08-04',
      days: days(['DONE', 'SKIPPED', 'MISSED', 'NOT_SCHEDULED']),
    },
  });
});

describe('ConstanceWidget', () => {
  it('asks for the account history with no range, so the server picks its own 28 days', async () => {
    await renderWidget(12);

    // The third argument is the freshness token that rides the request's dedup key.
    expect(getCheckHistory).toHaveBeenCalledWith(
      { ownerType: 'USER', ownerId: undefined, from: undefined, to: undefined },
      expect.anything(),
      expect.any(Number),
    );
  });

  it('shows the streak, the record and one square per returned day', async () => {
    await renderWidget(12);

    expect(screen.getByTestId('constance-value').props.children).toBe(12);
    expect(screen.getByText(/best: 21/)).toBeTruthy();
    // A missed day is on the strip even though the current streak is 12: the strip
    // is the history, not a picture of the number.
    expect(screen.getByTestId('check-cell-2026-08-03').props.accessibilityLabel).toContain('Missed');
  });

  it('labels a dormant run instead of resetting it', async () => {
    await renderWidget(12, { dormant: true });

    expect(screen.getByTestId('constance-dormant')).toBeTruthy();
    expect(screen.getByTestId('constance-value').props.children).toBe(12);
  });

  it('says the history is unavailable rather than drawing an empty month as failure', async () => {
    (getCheckHistory as jest.Mock).mockResolvedValue({ error: 'UnexpectedError' });

    await renderWidget(12);

    expect(screen.getByText('History unavailable right now')).toBeTruthy();
  });
});
