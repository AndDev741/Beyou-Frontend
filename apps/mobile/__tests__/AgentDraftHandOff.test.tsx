/**
 * A screen hands the assistant a message to start from.
 *
 * Second Brain does it after an answer: the assistant opens on a NEW conversation with the
 * question and the answer in its input, and nothing goes out until the person sends it. The
 * case that needed code is the very first open. That is when the assistant loads the history
 * and resumes the most recent conversation, which would bury the draft under an old thread.
 *
 * Mirrors the web contract (`openAgentPanelWithDraft`, `takeAgentDraft`, `onAgentDraft`).
 * Boundary mocked: the agent API modules and expo-router.
 */
jest.mock('@beyou/api/agent/agentChats', () => ({
  getAgentChats: jest.fn(),
  createAgentChat: jest.fn(),
  deleteAgentChat: jest.fn(),
  getAgentMessages: jest.fn(),
}));
jest.mock('@beyou/api/agent/agentStream', () => ({
  streamAgentMessage: jest.fn(),
}));
jest.mock('expo-router', () => ({
  usePathname: () => '/second-brain',
  useRouter: () => ({ push: jest.fn() }),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { login } from '../src/auth/authSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AgentWidget from '../src/ui/agent/AgentWidget';
import {
  onAgentDraft,
  onAgentPanelOpen,
  openAgentPanel,
  openAgentPanelWithDraft,
  takeAgentDraft,
} from '../src/ui/agent/agentPanelBus';

// The full chat sheet mounts behind each case, as in AgentWidget.test.tsx.
jest.setTimeout(20000);

const api = jest.requireMock('@beyou/api/agent/agentChats');
const stream = jest.requireMock('@beyou/api/agent/agentStream');

const DRAFT =
  'You asked: "How is your day going?"\nMy answer: Skipped the gym\n\nDo what this calls for in my routines, habits and tasks.';

const lastChat = { id: 'c1', title: 'Plan my week', createdAt: '2026-11-10T10:00:00', updatedAt: '2026-11-11T10:00:00' };

/** The assistant as the (app) layout mounts it: no bubble, opened over the bus. */
async function mountAssistant() {
  const store = makeStore();
  store.dispatch(tutorialCompletedEnter(true));
  // The assistant only opens for someone who said yes to the AI provider.
  store.dispatch({ type: login.fulfilled.type, payload: { aiConsent: 'GRANTED' } });
  await act(async () => {
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <AgentWidget showFab={false} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

async function handOver(text: string) {
  await act(async () => {
    openAgentPanelWithDraft(text);
  });
}

const inputValue = () => screen.getByTestId('agent-input').props.value;

beforeEach(() => {
  jest.clearAllMocks();
  // A draft a failed case left parked must not leak into the next one.
  takeAgentDraft();
  api.getAgentChats.mockResolvedValue({ success: [lastChat] });
  api.getAgentMessages.mockResolvedValue({
    success: [
      { role: 'USER', segments: [{ type: 'text', text: 'hello' }] },
      { role: 'ASSISTANT', segments: [{ type: 'text', text: 'An older reply' }] },
    ],
  });
});

describe('the bus', () => {
  it('hands a parked draft over once', () => {
    openAgentPanelWithDraft('A draft nobody was there to take');

    expect(takeAgentDraft()).toBe('A draft nobody was there to take');
    expect(takeAgentDraft()).toBeNull();
  });

  /** The chat has to know about the draft before it is asked to open and load its history. */
  it('announces the draft before it asks for the panel', () => {
    const order: string[] = [];
    const offDraft = onAgentDraft(() => order.push('draft'));
    const offOpen = onAgentPanelOpen(() => order.push('open'));

    openAgentPanelWithDraft('Anything');
    offDraft();
    offOpen();
    openAgentPanelWithDraft('Nobody listening');

    expect(order).toEqual(['draft', 'open']);
    takeAgentDraft();
  });
});

describe('a draft handed to the assistant', () => {
  it('opens a new conversation with the draft in the input on the very first open', async () => {
    await mountAssistant();

    await handOver(DRAFT);

    expect(inputValue()).toBe(DRAFT);
    // The history is still loaded for the list, but the last conversation is not resumed
    // over the draft.
    expect(api.getAgentChats).toHaveBeenCalledTimes(1);
    expect(api.getAgentMessages).not.toHaveBeenCalled();
    expect(screen.queryByText('An older reply')).toBeNull();
    expect(screen.getByText('What can I help with?')).toBeTruthy();
    expect(takeAgentDraft()).toBeNull();
  });

  it('sends nothing until the person sends it, and then starts a new chat with it', async () => {
    api.createAgentChat.mockResolvedValue({ success: { id: 'new1', title: 'x', createdAt: '', updatedAt: '' } });
    stream.streamAgentMessage.mockImplementation(
      (_chatId: string, _text: string, handlers: { onDone: (segments: unknown) => void }) => {
        handlers.onDone([{ type: 'text', text: 'Marked the gym as skipped.' }]);
        return Promise.resolve();
      },
    );
    await mountAssistant();

    await handOver(DRAFT);

    expect(api.createAgentChat).not.toHaveBeenCalled();
    expect(stream.streamAgentMessage).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('agent-send'));
    });

    expect(api.createAgentChat).toHaveBeenCalledTimes(1);
    expect(stream.streamAgentMessage).toHaveBeenCalledWith(
      'new1',
      DRAFT,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    await waitFor(() => expect(screen.getByText('Marked the gym as skipped.')).toBeTruthy());
    expect(inputValue()).toBe('');
  });

  it('leaves the conversation that was open for a fresh one', async () => {
    await mountAssistant();
    await act(async () => {
      openAgentPanel();
    });
    await waitFor(() => expect(screen.getByText('An older reply')).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId('agent-close'));
    });

    await handOver(DRAFT);

    expect(inputValue()).toBe(DRAFT);
    expect(screen.queryByText('An older reply')).toBeNull();
    // The old conversation is still in the history, one tap away.
    await act(async () => {
      await fireEvent.press(screen.getByTestId('agent-history'));
    });
    expect(screen.getAllByText('Plan my week').length).toBeGreaterThan(0);
  });

  it('still resumes the last conversation when the assistant is opened with no draft', async () => {
    await mountAssistant();

    await act(async () => {
      openAgentPanel();
    });

    expect(api.getAgentMessages).toHaveBeenCalledWith('c1', expect.anything());
    await waitFor(() => expect(screen.getByText('An older reply')).toBeTruthy());
    expect(inputValue()).toBe('');
  });
});
