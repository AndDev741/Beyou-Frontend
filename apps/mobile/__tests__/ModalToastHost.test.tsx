/**
 * A toast raised while a Modal is open has to be hosted INSIDE that Modal.
 *
 * React Native's `Modal` is not an overlay in our view tree: on Android it opens
 * a native Dialog with its own Window, on iOS it presents a separate view
 * controller. Either sits above the whole root view at the OS level, so the root
 * layout's toast host cannot paint over it. `zIndex` and `elevation` are no help
 * — they only order siblings within one window.
 *
 * The bug this pins: every toast raised from inside a modal was invisible. It
 * read as "only errors are broken" because the failure is asymmetric — success
 * paths notify and then `onClose()`, so the modal tears down and the toast
 * surfaces, while error paths `return` early and keep the modal open.
 *
 * Jest runs no native windows, so "is it on top?" is not observable here. What
 * IS observable is the structural fact the platform behaviour depends on: the
 * host is a descendant of the Modal. That is the same reasoning as
 * `spotlight-window-space.test.tsx`, which pins a coordinate space by asserting
 * which container it resolves against.
 *
 * NOTE: no JSX inside hoisted jest.mock factories — babel-plugin-jest-hoist
 * rejects the injected NativeWind helper as out-of-scope. `require('react')
 * .createElement` is not JSX, so it survives.
 */
// Assigned below the imports, NOT inside the factory: this project's babel config
// rewrites element creation to reference the injected _ReactNativeCSSInterop
// helper, and babel-plugin-jest-hoist rejects that as out-of-scope. A
// `mock`-prefixed reference is allowed, and it is only CALLED during a render,
// long after module init.
var mockToastHostRender: () => unknown = () => null;

jest.mock('react-native-toast-message', () => {
  // Stands in for the real host: renders a findable marker instead of the
  // Animated loop, whose timers never settle under jest + React 19 async act.
  const ToastStub = () => mockToastHostRender() as never;
  ToastStub.show = jest.fn();
  ToastStub.hide = jest.fn();
  return { __esModule: true, default: ToastStub };
});
// The real module is ESM that jest cannot parse; AgentChatModal pulls it in for
// the agent's in-app links.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('expo-localization', () => ({
  getCalendars: () => [{ timeZone: 'UTC' }],
  getLocales: () => [{ languageCode: 'en' }],
}));

import fs from 'fs';
import path from 'path';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import { ModalToastHost } from '../src/ui/BeyouToast';
import FormModal from '../src/ui/form/FormModal';
import BottomSheet from '../src/ui/BottomSheet';
import DeleteModal from '../src/ui/DeleteModal';
import GoalProgressModal from '../src/ui/goals/GoalProgressModal';
import AgentChatModal from '../src/ui/agent/AgentChatModal';

mockToastHostRender = () => <View testID="toast-host" />;

const mount = async (node: ReactElement) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

/**
 * The rule, stated as a tree fact: walk up from the host and find a Modal.
 *
 * Matched by host-element NAME, not by identity against the imported `Modal`.
 * jest-expo's React Native mock renders Modal as a host component, so the
 * composite never appears in the tree and an identity check silently never
 * matches — which looks exactly like a missing host.
 */
type Instance = ReturnType<typeof screen.getByTestId>;

const hasModalAncestor = (node: Instance) => {
  let current: Instance | null = node.parent;
  while (current) {
    // Host elements carry a string `type`; the declared ElementType union does
    // not admit the comparison without widening it first.
    if ((current.type as unknown as string) === 'Modal') return true;
    current = current.parent;
  }
  return false;
};

beforeEach(() => {
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  (Toast.show as jest.Mock).mockClear();
});

// Enough of the chat state for the sheet to render; the thread itself is covered
// by the agent's own suites.
const agentChatStub = {
  chats: [],
  activeChat: null,
  activeChatId: null,
  messages: [],
  streamSegments: [],
  input: '',
  setInput: jest.fn(),
  isSending: false,
  openChat: jest.fn(),
  startNewChat: jest.fn(),
  removeChat: jest.fn(),
  renameChat: jest.fn(),
  clearAllChats: jest.fn(),
  send: jest.fn(),
  ensureLoaded: jest.fn(),
} as never;

const SHELLS: { what: string; node: () => ReactElement }[] = [
  {
    // Habit, goal, task and category forms all render through this one.
    what: 'the forms shell',
    node: () => (
      <FormModal
        visible
        title="Create habit"
        submitLabel="Save habit"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        testID="form-modal"
      >
        <Text>a field</Text>
      </FormModal>
    ),
  },
  {
    // Schedule, icon picker, select, section and item picker sheets.
    what: 'the bottom sheet shell',
    node: () => (
      <BottomSheet visible onClose={jest.fn()}>
        <Text>sheet body</Text>
      </BottomSheet>
    ),
  },
  {
    what: 'the AI assistant panel',
    node: () => <AgentChatModal visible onClose={jest.fn()} chat={agentChatStub} />,
  },
  {
    what: 'the delete confirmation',
    node: () => (
      <DeleteModal
        visible
        deletePhrase="Delete this habit?"
        name="Read"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    ),
  },
  {
    what: 'the goal progress dialog',
    node: () => (
      <GoalProgressModal
        visible
        name="Read"
        currentValue={10}
        targetValue={100}
        onClose={jest.fn()}
        onApply={jest.fn(async () => {})}
      />
    ),
  },
];

for (const shell of SHELLS) {
  it(`hosts toasts inside ${shell.what}, not behind it`, async () => {
    await mount(shell.node());

    const hosts = screen.getAllByTestId('toast-host');
    expect(hosts.length).toBeGreaterThan(0);
    // Every host in this tree belongs to the modal — there is no root layout here.
    expect(hosts.every(hasModalAncestor)).toBe(true);
  });
}

/**
 * The guard that needs no maintenance. The shells above prove the wiring for the
 * modals that exist today; this catches the one somebody adds next year, which
 * would otherwise ship with invisible toasts and no failing test.
 */
it('every component that renders a Modal also hosts toasts inside it', () => {
  const root = path.join(__dirname, '..', 'src');
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
        const source = fs.readFileSync(full, 'utf8');
        if (source.includes('<Modal') && !source.includes('<ModalToastHost')) {
          offenders.push(path.relative(root, full));
        }
      }
    }
  };

  walk(root);
  expect(offenders).toEqual([]);
});

/**
 * The other half, and the half a naive fix gets wrong: a modal that closes while
 * a toast is still running must hand it down, not take it away. Nearly every
 * success path in the app notifies and then closes in the same handler, so
 * without the handoff this change would have traded invisible error toasts for
 * invisible success ones.
 */
describe('handoff when the modal closes underneath a live toast', () => {
  beforeEach(() => {
    // setImmediate is left real: React's async act scheduling rides it, and
    // faking it deadlocks the awaited render/unmount below.
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays a still-running toast with only the time it had left', async () => {
    const view = await render(<ModalToastHost />);

    notify.success('Habit created');
    expect(Toast.show).toHaveBeenCalledTimes(1);
    expect((Toast.show as jest.Mock).mock.calls[0][0]).toMatchObject({
      text1: 'Habit created',
      visibilityTime: 4000,
    });

    jest.advanceTimersByTime(1000);
    await view.unmount();
    jest.runOnlyPendingTimers();

    expect(Toast.show).toHaveBeenCalledTimes(2);
    // The remaining 3s, not a fresh 4s: a toast must not restart its life every
    // time a modal closes under it.
    expect((Toast.show as jest.Mock).mock.calls[1][0]).toMatchObject({
      text1: 'Habit created',
      visibilityTime: 3000,
    });
  });

  it('does not replay a toast that already ran out', async () => {
    const view = await render(<ModalToastHost />);

    notify.error('Something broke');
    jest.advanceTimersByTime(4000);
    await view.unmount();
    jest.runOnlyPendingTimers();

    expect(Toast.show).toHaveBeenCalledTimes(1);
  });

  it('does not replay anything when the modal closed with no toast up', async () => {
    const view = await render(<ModalToastHost />);

    await view.unmount();
    jest.runOnlyPendingTimers();

    expect(Toast.show).not.toHaveBeenCalled();
  });
});
