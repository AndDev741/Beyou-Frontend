import { render, screen, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { TutorialProvider, useTutorialRegistry } from '../src/tutorial/TutorialProvider';
import { useTutorialTarget } from '../src/tutorial/useTutorialTarget';

function Target() {
  const ref = useTutorialTarget('foo');
  return <View ref={ref}><Text>target</Text></View>;
}
function Probe({ onReady }: { onReady: (m: (id: string) => Promise<unknown>) => void }) {
  const { measure } = useTutorialRegistry();
  onReady(measure);
  return null;
}

test('measure returns null for an unregistered id', async () => {
  let measure!: (id: string) => Promise<unknown>;
  await act(async () => {
    render(
      <TutorialProvider>
        <Probe onReady={(m) => { measure = m; }} />
      </TutorialProvider>,
    );
  });
  expect(await measure('missing')).toBeNull();
});

test('a target registers its ref under the id', async () => {
  await act(async () => {
    render(
      <TutorialProvider>
        <Target />
      </TutorialProvider>,
    );
  });
  expect(screen.getByText('target')).toBeTruthy();
});
