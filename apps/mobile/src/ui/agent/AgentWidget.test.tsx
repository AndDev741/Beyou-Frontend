import React from 'react';
import { Provider } from 'react-redux';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AgentWidget from './AgentWidget';
import { BeyouThemeProvider } from '../../theme/ThemeProvider';
import { makeStore } from '../../store';
import '../../i18n';

jest.mock('@beyou/api/agent/agentChats', () => ({
  getAgentChats: jest.fn(),
  createAgentChat: jest.fn(),
  deleteAgentChat: jest.fn(),
  getAgentMessages: jest.fn(),
}));

jest.mock('@beyou/api/agent/agentStream', () => ({
  streamAgentMessage: jest.fn(),
}));

// Real expo-router is ESM that fails to parse under jest (see AGENTS.md).
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  usePathname: () => '/habits',
  useRouter: () => ({ push: mockRouterPush }),
}));

const api = jest.requireMock('@beyou/api/agent/agentChats');
const stream = jest.requireMock('@beyou/api/agent/agentStream');

/** Turn a plain text reply into the segment shape the done event carries. */
const textTurn = (text: string) => [{ type: 'text', text }];

const wrap = async () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <AgentWidget />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('AgentWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getAgentChats.mockResolvedValue({ success: [] });
  });

  it('renders the FAB and no chat surface before opening', async () => {
    const { getByTestId, queryByTestId } = await wrap();
    expect(getByTestId('agent-fab')).toBeTruthy();
    expect(queryByTestId('agent-input')).toBeNull();
  });

  it('opens the modal with the empty state when there are no chats', async () => {
    const { getByTestId, getByText } = await wrap();
    await act(async () => {
      fireEvent.press(getByTestId('agent-fab'));
    });
    expect(api.getAgentChats).toHaveBeenCalled();
    expect(getByText('What can I help with?')).toBeTruthy();
  });

  it('resumes the most recent chat on open', async () => {
    api.getAgentChats.mockResolvedValue({
      success: [
        { id: 'c1', title: 'Plan my week', createdAt: '2026-07-10T10:00:00', updatedAt: '2026-07-11T10:00:00' },
        { id: 'c2', title: 'Older chat', createdAt: '2026-07-01T10:00:00', updatedAt: '2026-07-02T10:00:00' },
      ],
    });
    api.getAgentMessages.mockResolvedValue({
      success: [
        { role: 'USER', segments: textTurn('hello') },
        { role: 'ASSISTANT', segments: textTurn('Hi! How can I help?') },
      ],
    });

    const { getByTestId, getByText } = await wrap();
    await act(async () => {
      fireEvent.press(getByTestId('agent-fab'));
    });

    expect(api.getAgentMessages).toHaveBeenCalledWith('c1', expect.anything());
    await waitFor(() => expect(getByText('Hi! How can I help?')).toBeTruthy());
  });

  it('creates a chat on first message and shows the reply', async () => {
    api.createAgentChat.mockResolvedValue({
      success: { id: 'new1', title: 'create a habit', createdAt: '', updatedAt: '' },
    });
    // Drive the stream straight to a done event carrying the reply (no domains,
    // so no refetch fires — keeps the test focused on display).
    stream.streamAgentMessage.mockImplementation(
      (_chatId: string, _text: string, handlers: { onDone: (s: unknown) => void }) => {
        handlers.onDone(textTurn('Habit **Read** created!'));
        return Promise.resolve();
      },
    );

    const { getByTestId, getByText } = await wrap();
    await act(async () => {
      fireEvent.press(getByTestId('agent-fab'));
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('agent-input'), 'create a habit');
    });
    await act(async () => {
      fireEvent.press(getByTestId('agent-send'));
    });

    expect(api.createAgentChat).toHaveBeenCalledWith(expect.anything(), 'create a habit');
    // 4th arg: page context from usePathname (mocked as /habits)
    expect(stream.streamAgentMessage).toHaveBeenCalledWith(
      'new1', 'create a habit', expect.anything(), '/habits', expect.anything(),
    );
    await waitFor(() => expect(getByText('Read')).toBeTruthy());
  });

  it('does not deliver a late reply into a chat opened mid-flight', async () => {
    const chatA = { id: 'a', title: 'Chat A', createdAt: '2026-07-10T10:00:00', updatedAt: '2026-07-11T10:00:00' };
    const chatB = { id: 'b', title: 'Chat B', createdAt: '2026-07-01T10:00:00', updatedAt: '2026-07-02T10:00:00' };
    api.getAgentChats.mockResolvedValue({ success: [chatA, chatB] });
    api.getAgentMessages.mockResolvedValue({ success: [] });
    // Capture the stream handlers so we can fire onDone AFTER switching chats.
    let captured: { onDone: (s: unknown) => void } | null = null;
    stream.streamAgentMessage.mockImplementation(
      (_chatId: string, _text: string, handlers: { onDone: (s: unknown) => void }) => {
        captured = handlers;
        return new Promise(() => {}); // never resolves on its own
      },
    );

    const { getByTestId, queryByText, getByText } = await wrap();
    await act(async () => {
      fireEvent.press(getByTestId('agent-fab'));
    });

    // Send in chat A (reply stays pending)…
    await act(async () => {
      fireEvent.changeText(getByTestId('agent-input'), 'slow question');
    });
    await act(async () => {
      fireEvent.press(getByTestId('agent-send'));
    });

    // …switch to chat B while the agent is still replying…
    await act(async () => {
      fireEvent.press(getByTestId('agent-history'));
    });
    await act(async () => {
      fireEvent.press(getByText('Chat B'));
    });

    // …then the reply for A arrives: it must NOT appear in B's thread.
    await act(async () => {
      captured?.onDone(textTurn('late reply for A'));
    });
    expect(queryByText('late reply for A')).toBeNull();
    expect(queryByText('slow question')).toBeNull();
  });

  it('aborts the in-flight stream when the widget unmounts (logout)', async () => {
    api.createAgentChat.mockResolvedValue({
      success: { id: 'new1', title: 'q', createdAt: '', updatedAt: '' },
    });
    // Capture the AbortSignal (5th arg) and keep the stream pending.
    let signal: AbortSignal | undefined;
    stream.streamAgentMessage.mockImplementation(
      (_c: string, _t: string, _h: unknown, _p: unknown, sig: AbortSignal) => {
        signal = sig;
        return new Promise(() => {});
      },
    );

    const view = await wrap();
    await act(async () => {
      fireEvent.press(view.getByTestId('agent-fab'));
    });
    await act(async () => {
      fireEvent.changeText(view.getByTestId('agent-input'), 'slow one');
    });
    await act(async () => {
      fireEvent.press(view.getByTestId('agent-send'));
    });

    expect(signal?.aborted).toBe(false);
    await act(async () => {
      view.unmount();
    });
    expect(signal?.aborted).toBe(true);
  });

  it('switches to the history pane and back', async () => {
    api.getAgentChats.mockResolvedValue({
      success: [{ id: 'c1', title: 'Plan my week', createdAt: '2026-07-10T10:00:00', updatedAt: '2026-07-11T10:00:00' }],
    });
    api.getAgentMessages.mockResolvedValue({ success: [] });

    const { getByTestId, getAllByText } = await wrap();
    await act(async () => {
      fireEvent.press(getByTestId('agent-fab'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('agent-history'));
    });
    // Title appears in the header and in the history row.
    expect(getAllByText('Plan my week').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.press(getByTestId('agent-history-back'));
    });
    expect(getByTestId('agent-input')).toBeTruthy();
  });
});
