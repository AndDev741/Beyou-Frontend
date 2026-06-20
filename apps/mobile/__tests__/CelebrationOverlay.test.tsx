/** CelebrationOverlay (P3-T6) — renders level-up / streak celebrations from the
 *  shared celebration queue; nothing when empty. */
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react-native';
import { celebrationPushed } from '@beyou/state/celebration/celebrationSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CelebrationOverlay from '../src/ui/dashboard/CelebrationOverlay';

const renderOverlay = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <CelebrationOverlay />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('CelebrationOverlay', () => {
  it('renders nothing when the queue is empty', async () => {
    await renderOverlay(makeStore());
    expect(screen.queryByTestId('celebration-overlay')).toBeNull();
  });

  it('shows a level-up celebration badge', async () => {
    const store = makeStore();
    store.dispatch(celebrationPushed({ kind: 'levelUp', level: 3 }));
    await renderOverlay(store);
    expect(screen.getByTestId('celebration-overlay')).toBeTruthy();
    expect(screen.getByText('LV 3')).toBeTruthy();
  });

  it('shows a streak-milestone celebration badge', async () => {
    const store = makeStore();
    store.dispatch(celebrationPushed({ kind: 'streakMilestone', days: 7 }));
    await renderOverlay(store);
    expect(screen.getByTestId('celebration-overlay')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });
});
