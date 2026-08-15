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
 * What this pins is the choice between the two helpers, because that is the whole bug
 * and the one thing a future edit could quietly put back. It cannot pin the pixels: the
 * measurement happens in native layout, `behavior` is destructured out of
 * KeyboardAvoidingView's props before they reach any host view, and RN 0.85 removed the
 * emitter that let a test fake a keyboard. The value each helper returns is covered in
 * keyboard.test.ts.
 */
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('../src/ui/keyboard', () => ({
  keyboardAvoidingBehavior: jest.fn(() => undefined),
  modalKeyboardAvoidingBehavior: jest.fn(() => 'padding'),
}));

import { Provider } from 'react-redux';
import { render, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AgentChatModal from '../src/ui/agent/AgentChatModal';
import { keyboardAvoidingBehavior, modalKeyboardAvoidingBehavior } from '../src/ui/keyboard';
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

const renderChat = async () => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AgentChatModal visible onClose={jest.fn()} chat={chat()} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('asks for the modal answer, not the one written for the app window', async () => {
  await renderChat();

  expect(modalKeyboardAvoidingBehavior).toHaveBeenCalled();
  // The passthrough. Inside a Modal there is nothing behind it doing the work, so
  // choosing this one puts the input back under the keyboard.
  expect(keyboardAvoidingBehavior).not.toHaveBeenCalled();
});

it('renders the composer it is protecting', async () => {
  const screen = await renderChat();

  expect(screen.getByTestId('agent-keyboard-avoider')).toBeTruthy();
  expect(screen.getByTestId('agent-input')).toBeTruthy();
  expect(screen.getByTestId('agent-send')).toBeTruthy();
});
