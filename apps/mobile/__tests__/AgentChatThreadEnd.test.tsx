/**
 * The last card of a long reply has to stay above the composer.
 *
 * A reply that uses several tools stacks a card per tool ("Tasks checked",
 * "Routines checked", "Task created", ...). Two things left the last of them
 * painted under the composer bar: the list had 16px of clearance at the bottom,
 * and the auto-scroll animated on every RAF-batched content-size change during
 * streaming, so the scrolls cancelled each other and the final one landed short
 * once the streaming bubble was swapped for the persisted message.
 *
 * What this pins: the content container clears the composer by a real margin, and
 * while a reply is streaming the scroll jumps instead of animating. The settled
 * case keeps its animation.
 */
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn() }),
}));

import { ScrollView } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import type { agentSegment } from '@beyou/types/agent/chatType';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AgentChatModal from '../src/ui/agent/AgentChatModal';
import type { AgentChatState } from '../src/ui/agent/useAgentChat';

const TOOLS = [
  'getUserTasks',
  'getUserRoutines',
  'getUserHabits',
  'createUserTask',
  'createUserHabit',
  'addTaskToRoutineSection',
  'createUserGoal',
  'getUserGoals',
];

const toolSegments = (): agentSegment[] =>
  TOOLS.map((tool) => ({ type: 'tool', tool, status: 'finished', domains: [] }));

const longThread = (): AgentChatState['messages'] => [
  { role: 'USER', segments: [{ type: 'text', text: 'Set up my week' }] },
  { role: 'ASSISTANT', segments: toolSegments() },
  { role: 'USER', segments: [{ type: 'text', text: 'And the goals?' }] },
  { role: 'ASSISTANT', segments: [...toolSegments(), { type: 'text', text: 'Done.' }] },
] as unknown as AgentChatState['messages'];

const chat = (overrides: Partial<AgentChatState> = {}): AgentChatState =>
  ({
    chats: [],
    activeChat: null,
    activeChatId: 'c1',
    messages: longThread(),
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
    ...overrides,
  }) as unknown as AgentChatState;

const renderChat = async (state: AgentChatState) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AgentChatModal visible onClose={jest.fn()} chat={state} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

// The jest ScrollView mock puts scrollToEnd on the prototype, so spying there sees
// the call the component makes through its ref.
let scrollToEnd: jest.SpyInstance;

beforeEach(() => {
  scrollToEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const contentGrew = async () => {
  await act(async () => {
    fireEvent(screen.getByTestId('agent-thread'), 'contentSizeChange', 390, 2400);
  });
};

it('clears the composer under the last card of a long thread', async () => {
  await renderChat(chat());

  const style = screen.getByTestId('agent-thread').props.contentContainerStyle;
  const bottom = Object.assign({}, ...[style].flat(Infinity).filter(Boolean)).paddingBottom ?? 0;
  expect(bottom).toBeGreaterThanOrEqual(24);
  // The thread ends in a real node the padding is measured against.
  expect(screen.getByTestId('agent-thread-end')).toBeTruthy();
});

it('jumps to the end without animating while a reply is streaming', async () => {
  await renderChat(chat({ isSending: true, streamSegments: toolSegments() }));
  scrollToEnd.mockClear();

  await contentGrew();

  expect(scrollToEnd).toHaveBeenCalled();
  for (const call of scrollToEnd.mock.calls) {
    expect(call[0]).toEqual({ animated: false });
  }
});

it('keeps the animated scroll once the reply has settled', async () => {
  await renderChat(chat({ isSending: false }));
  scrollToEnd.mockClear();

  await contentGrew();

  // useReducedMotion is mocked to false in jest.setup.js, so the settled scroll
  // is the animated one.
  expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: true });
});
