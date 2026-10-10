/**
 * A page's study room on the phone. The setup comes first on a room nobody set up; then the chat
 * (a question, the cited answer, saving it to the page, cards from it), the sources (a link, text,
 * a PDF from the phone, the switch for using one) and the studio (a summary to read, a quiz to
 * take). Each goes through the endpoint the web's room uses.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify + the document picker and the
 * native upload.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'ds' }),
}));

const mockPickDocument = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...args: unknown[]) => mockPickDocument(...args) }));

const mockUpload = jest.fn();
jest.mock('../src/lib/uploadFile', () => ({ uploadFile: (...args: unknown[]) => mockUpload(...args) }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookStudyScreen from '../app/notebook-study';

const citation = { n: 1, kind: 'PAGE', sourceId: null, chunkId: null, pageId: 'ds', title: 'Your notes', pageNumber: null, excerpt: '' };
const message = (id: string, role: 'USER' | 'ASSISTANT', content: string) => ({
  id, role, content, citations: role === 'ASSISTANT' ? [citation] : [], createdAt: '2026-10-09T00:00:00Z',
});
const source = (id: string, enabled = true) => ({
  id, pageId: 'ds', pageTitle: 'Data Structures', inherited: false, kind: 'LINK', title: `Source ${id}`, url: 'https://example.com/x',
  status: 'READY', progress: 100, errorKey: null, enabled, pageCount: null, charCount: 100, createdAt: '2026-10-09T00:00:00Z',
});

let configured = true;
let sources = [source('a')];
let calls: { method: string; url: string; body?: any }[] = [];

const room = () => ({
  page: { id: 'ds', title: 'Data Structures', icon: null },
  breadcrumb: [],
  overview: null,
  messages: [],
  outputs: [],
  sources,
  cardsTotal: 0,
  cardsDue: 0,
  setup: { goal: configured ? 'Pass the exam' : null, scope: 'PAGE', configuredAt: configured ? '2026-10-09T00:00:00Z' : null },
  scopes: [
    { scope: 'PAGE', pages: 1, words: 120 },
    { scope: 'SUBTREE', pages: 3, words: 400 },
    { scope: 'TOPIC', pages: 5, words: 900 },
  ],
  discovery: true,
});

beforeEach(() => {
  configured = true;
  sources = [source('a')];
  calls = [];
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  setHttpClient({
    get: async (url: string) => ({ data: url.endsWith('/sources') ? sources : url.endsWith('/study') ? room() : {}, headers: {} }),
    post: async (url: string, body: any) => {
      calls.push({ method: 'POST', url, body });
      if (url.endsWith('/chat')) {
        return { data: { question: message('q', 'USER', body.message), answer: message('a', 'ASSISTANT', 'A heap keeps the **smallest** key on top.') }, headers: {} };
      }
      if (url.endsWith('/outputs')) {
        return {
          data: body.kind === 'QUIZ'
            ? { id: 'quiz', pageId: 'ds', kind: 'QUIZ', title: 'Data Structures', markdown: null, citations: [], questions: [{ index: 0, question: 'Root of a min-heap?', options: ['Smallest', 'Largest'] }], score: null, total: null, passedAt: null, createdAt: '2026-10-09T00:00:00Z' }
            : { id: 'sum', pageId: 'ds', kind: body.kind, title: 'Data Structures', markdown: '## Heaps\nThe root is the smallest.', citations: [], questions: null, score: null, total: null, passedAt: null, createdAt: '2026-10-09T00:00:00Z' },
          headers: {},
        };
      }
      if (url.endsWith('/quiz-result')) {
        return { data: { score: 1, total: 1, passed: true, answers: [{ index: 0, chosen: 0, correct: 0, right: true, explanation: 'The smallest key is on top.', citation: null }], xpEarned: 20, refreshUi: null }, headers: {} };
      }
      if (url.endsWith('/cards')) return { data: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], headers: {} };
      if (url.endsWith('/sources/link')) {
        sources = [...sources, source('link')];
        return { data: source('link'), headers: {} };
      }
      if (url.endsWith('/sources/text')) {
        sources = [...sources, source('text')];
        return { data: source('text'), headers: {} };
      }
      return { data: {}, headers: {} };
    },
    put: async (url: string, body: any) => {
      calls.push({ method: 'PUT', url, body });
      return { data: { goal: body.goal || null, scope: body.scope, configuredAt: '2026-10-09T00:00:00Z' }, headers: {} };
    },
    patch: async (url: string, body: any) => {
      calls.push({ method: 'PATCH', url, body });
      return { data: { ...sources[0], ...body }, headers: {} };
    },
    delete: async () => ({ data: undefined, headers: {} }),
  } as never);
});

async function renderRoom() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <NotebookStudyScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.queryByTestId('study-loading')).toBeNull());
}

const press = async (testID: string, index = 0) => {
  await act(async () => {
    fireEvent.press(screen.getAllByTestId(testID)[index]);
  });
};

const type = async (testID: string, text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
};

describe('NotebookStudyScreen', () => {
  it('opens on the setup when the room was never set up, and saves the goal and scope', async () => {
    configured = false;
    await renderRoom();

    expect(screen.getByTestId('study-setup')).toBeTruthy();
    await type('study-setup-goal', 'Pass the exam');
    await press('study-setup-scope-SUBTREE');
    await press('study-setup-save');

    expect(calls).toEqual([{ method: 'PUT', url: '/notebook/pages/ds/study/setup', body: { goal: 'Pass the exam', scope: 'SUBTREE' } }]);
    expect(screen.getByTestId('study-room')).toBeTruthy();
  });

  it('asks a question, shows the cited answer, saves it to the page and makes cards from it', async () => {
    await renderRoom();

    await type('study-input', 'What does a heap keep on top?');
    await press('study-send');
    expect(calls[0]).toEqual({ method: 'POST', url: '/notebook/ai/pages/ds/chat', body: { message: 'What does a heap keep on top?' } });
    expect(screen.getByText('smallest')).toBeTruthy();
    expect(screen.getByTestId('study-citations')).toBeTruthy();

    await press('study-save-to-page');
    expect(calls[1]).toEqual({ method: 'POST', url: '/notebook/pages/ds/append', body: { markdown: 'A heap keeps the **smallest** key on top.' } });

    await press('study-make-cards');
    expect(calls[2]).toEqual({ method: 'POST', url: '/notebook/ai/pages/ds/cards', body: { text: 'A heap keeps the **smallest** key on top.', count: 3 } });
    expect(notify.success).toHaveBeenCalledWith('3 cards added to this page');
  });

  it('adds a link and some text as sources, and switches one off', async () => {
    await renderRoom();
    await press('study-tab-sources');

    await press('study-add-link');
    await type('study-link-input', 'example.com/heaps');
    await press('study-link-save');
    expect(calls[0]).toEqual({ method: 'POST', url: '/notebook/pages/ds/sources/link', body: { url: 'https://example.com/heaps' } });

    await press('study-add-text');
    await type('study-text-title', 'Lecture 7');
    await type('study-text-body', 'Heaps are trees.');
    await press('study-text-save');
    expect(calls[1]).toEqual({ method: 'POST', url: '/notebook/pages/ds/sources/text', body: { title: 'Lecture 7', text: 'Heaps are trees.' } });

    await waitFor(() => expect(screen.getAllByTestId('study-source')).toHaveLength(3));
    await act(async () => {
      fireEvent(screen.getAllByTestId('study-source-toggle')[0], 'valueChange', false);
    });
    expect(calls[2]).toEqual({ method: 'PATCH', url: '/notebook/sources/a', body: { enabled: false } });
  });

  it('uploads a PDF picked on the phone, and refuses one over the limit', async () => {
    mockUpload.mockResolvedValue({ success: source('pdf') });
    await renderRoom();
    await press('study-tab-sources');

    mockPickDocument.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///big.pdf', size: 40 * 1024 * 1024 }] });
    await press('study-add-pdf');
    expect(mockUpload).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalled();

    mockPickDocument.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///cache/3f2a.pdf', name: 'ostep.pdf', size: 2 * 1024 * 1024 }] });
    await press('study-add-pdf');
    expect(mockUpload).toHaveBeenCalledWith('/notebook/pages/ds/sources/pdf', 'file:///cache/3f2a.pdf', 'application/pdf', 'ostep.pdf');
  });

  it('makes a summary to read, and a quiz that is graded and pays', async () => {
    await renderRoom();
    await press('study-tab-studio');

    await press('study-make-SUMMARY');
    expect(calls[0]).toEqual({ method: 'POST', url: '/notebook/ai/pages/ds/outputs', body: { kind: 'SUMMARY' } });
    expect(screen.getByText('Heaps')).toBeTruthy();

    await press('study-make-QUIZ');
    await press('study-quiz-option-0-0');
    await press('study-quiz-submit');
    expect(calls[2]).toEqual({ method: 'POST', url: '/notebook/outputs/quiz/quiz-result', body: { answers: [0] } });
    expect(screen.getByTestId('study-quiz-result')).toBeTruthy();
    expect(screen.getByText('+20 XP for passing')).toBeTruthy();
  });
});
