/**
 * The shared mobile empty state — mirror of the web's. There is one rule: an
 * IconTile with the entity's icon (never an emoji), a short title, one line saying
 * how to fill it, and a single CTA. A search with no result uses ghost.
 */
import { Provider } from 'react-redux';
import { View } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Trophy } from 'lucide-react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import EmptyState from '../src/ui/EmptyState';

const renderIt = async (node: React.ReactNode) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

const icon = (
  <View testID="entity-icon">
    <Trophy size={20} />
  </View>
);

it('shows the icon, the title and the description', async () => {
  await renderIt(<EmptyState icon={icon} title="No goals yet" description="Track a target" testID="empty" />);

  expect(screen.getByTestId('entity-icon')).toBeTruthy();
  expect(screen.getByText('No goals yet')).toBeTruthy();
  expect(screen.getByText('Track a target')).toBeTruthy();
});

it('leaves out the actions that were not asked for', async () => {
  await renderIt(<EmptyState icon={icon} title="No goals yet" testID="empty" />);

  expect(screen.queryByTestId('empty-action')).toBeNull();
  expect(screen.queryByTestId('empty-secondary')).toBeNull();
  expect(screen.queryByTestId('empty-dismiss')).toBeNull();
});

it('fires the primary, the secondary and the dismiss', async () => {
  const onAction = jest.fn();
  const onSecondary = jest.fn();
  const onDismiss = jest.fn();
  await renderIt(
    <EmptyState
      icon={icon}
      title="No routines yet"
      actionLabel="Create routine"
      onAction={onAction}
      secondaryLabel="or ask the Assistant"
      onSecondary={onSecondary}
      onDismiss={onDismiss}
      testID="empty"
    />,
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('empty-action'));
    fireEvent.press(screen.getByTestId('empty-secondary'));
    fireEvent.press(screen.getByTestId('empty-dismiss'));
  });

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onSecondary).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
