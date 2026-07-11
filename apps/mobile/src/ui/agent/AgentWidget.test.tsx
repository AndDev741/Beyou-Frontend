import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AgentWidget from './AgentWidget';
import { BeyouThemeProvider } from '../../theme/ThemeProvider';
import '../../i18n';

jest.mock('@beyou/api/agent/agentChats', () => ({
  getAgentChats: jest.fn(),
  createAgentChat: jest.fn(),
  deleteAgentChat: jest.fn(),
  getAgentMessages: jest.fn(),
  sendAgentMessage: jest.fn(),
}));

const api = jest.requireMock('@beyou/api/agent/agentChats');

const wrap = async () =>
  render(
    <BeyouThemeProvider>
      <AgentWidget />
    </BeyouThemeProvider>,
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
        { role: 'USER', text: 'hello' },
        { role: 'ASSISTANT', text: 'Hi! How can I help?' },
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
    api.sendAgentMessage.mockResolvedValue({ success: 'Habit **Read** created!' });

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
    expect(api.sendAgentMessage).toHaveBeenCalledWith('new1', 'create a habit', expect.anything());
    await waitFor(() => expect(getByText('Read')).toBeTruthy());
  });

  it('does not deliver a late reply into a chat opened mid-flight', async () => {
    const chatA = { id: 'a', title: 'Chat A', createdAt: '2026-07-10T10:00:00', updatedAt: '2026-07-11T10:00:00' };
    const chatB = { id: 'b', title: 'Chat B', createdAt: '2026-07-01T10:00:00', updatedAt: '2026-07-02T10:00:00' };
    api.getAgentChats.mockResolvedValue({ success: [chatA, chatB] });
    api.getAgentMessages.mockResolvedValue({ success: [] });
    let resolveSend: (v: unknown) => void = () => {};
    api.sendAgentMessage.mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));

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
      resolveSend({ success: 'late reply for A' });
    });
    expect(queryByText('late reply for A')).toBeNull();
    expect(queryByText('slow question')).toBeNull();
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
