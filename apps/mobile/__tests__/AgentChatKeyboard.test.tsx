/**
 * The composer has to stay where you can see it.
 *
 * The agent chat is a sheet pinned to the bottom of a Modal, so its input is the lowest
 * thing on screen and the first thing a keyboard covers. It was covered: the
 * KeyboardAvoidingView was a passthrough on Android, on the reasoning that the OS pans
 * the window anyway. True of the app's window. Never true of a Modal's, which React
 * Native hands SOFT_INPUT_ADJUST_RESIZE and which Android 15 then ignores under the
 * edge-to-edge layout Expo enforces. Nothing moved, and you typed into an input you
 * could not see.
 *
 * What this pins is that the sheet is wired to the lift at all — that the container
 * takes the hook's padding and hands it back its own layout. The arithmetic itself,
 * including the return to zero that the second attempt got wrong, is covered case by
 * case in keyboard.test.tsx.
 */
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { Keyboard } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AgentChatModal from '../src/ui/agent/AgentChatModal';
import type { AgentChatState } from '../src/ui/agent/useAgentChat';

const chat = (): AgentChatState =>
  ({
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
  }) as unknown as AgentChatState;

const listeners: Record<string, (event: unknown) => void> = {};

const renderChat = async () => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AgentChatModal visible onClose={jest.fn()} chat={chat()} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

const padding = () => {
  const style = screen.getByTestId('agent-keyboard-avoider').props.style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean)).paddingBottom ?? 0;
};

beforeEach(() => {
  for (const key of Object.keys(listeners)) delete listeners[key];
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    handler: (payload: unknown) => void,
  ) => {
    listeners[event] = handler;
    return { remove: () => delete listeners[event] };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('gives up the bottom of the sheet while the keyboard is up, and takes it back after', async () => {
  await renderChat();

  await act(async () => {
    listeners.keyboardDidShow?.({ endCoordinates: { height: 320 } });
  });
  // Without this the composer is the lowest thing on screen and the keyboard is on
  // top of it.
  expect(padding()).toBe(320);

  await act(async () => {
    listeners.keyboardDidHide?.({});
  });
  // And back to nothing, or the sheet floats above the bottom of the screen with the
  // dashboard showing through underneath it.
  expect(padding()).toBe(0);
});

it('renders the composer it is protecting', async () => {
  await renderChat();

  expect(screen.getByTestId('agent-input')).toBeTruthy();
  expect(screen.getByTestId('agent-send')).toBeTruthy();
});
