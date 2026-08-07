/**
 * CelebrationOverlay — sobe de nível e marco de sequência, lidos da fila
 * compartilhada; nada quando ela está vazia. O nível mora DENTRO do anel do
 * sistema (mesma peça do check-in e da marca), não num badge à parte.
 */
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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

  it('puts the level inside the ring', async () => {
    const store = makeStore();
    store.dispatch(celebrationPushed({ kind: 'levelUp', level: 3 }));
    await renderOverlay(store);
    expect(screen.getByTestId('celebration-overlay')).toBeTruthy();
    expect(screen.getByTestId('celebration-ring')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows the streak count in the same ring', async () => {
    const store = makeStore();
    store.dispatch(celebrationPushed({ kind: 'streakMilestone', days: 7 }));
    await renderOverlay(store);
    expect(screen.getByTestId('celebration-overlay')).toBeTruthy();
    expect(screen.getByTestId('celebration-ring')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('clears the queue from the Continue button', async () => {
    const store = makeStore();
    store.dispatch(celebrationPushed({ kind: 'levelUp', level: 3 }));
    await renderOverlay(store);

    await act(async () => {
      fireEvent.press(screen.getByTestId('celebration-continue'));
    });

    expect(store.getState().celebration.queue).toHaveLength(0);
    expect(screen.queryByTestId('celebration-overlay')).toBeNull();
  });
});
