/**
 * A page's cards on the phone: how many are due today with the review a tap away, a card's answer
 * opening under its question, "Draft with AI", writing, editing and deleting a card. Each goes
 * through the endpoint the web's cards block uses, and the screen is told to read the page again.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import CardsTab from '../src/notebook/cards/CardsTab';

const card = (id: string, front: string, dueOn: string) => ({
  id, pageId: 'ds', front, back: `Answer to ${front}`, sourceLabel: null, dueOn, intervalDays: 1, reps: 0,
  createdAt: '2026-10-01T00:00:00Z',
});

let deck = [card('a', 'Why is array access O(1)?', '2000-01-01'), card('b', 'What is a heap?', '2999-01-01')];
let calls: { method: string; url: string; body?: any }[] = [];

beforeEach(() => {
  deck = [card('a', 'Why is array access O(1)?', '2000-01-01'), card('b', 'What is a heap?', '2999-01-01')];
  calls = [];
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  setHttpClient({
    get: async () => ({ data: deck, headers: {} }),
    post: async (url: string, body: any) => {
      calls.push({ method: 'POST', url, body });
      if (url.includes('/ai/')) return { data: [card('c', 'Drafted', '2000-01-01'), card('d', 'Drafted too', '2000-01-01')], headers: {} };
      return { data: card('e', body.front, '2000-01-01'), headers: {} };
    },
    put: async () => ({ data: {}, headers: {} }),
    patch: async (url: string, body: any) => {
      calls.push({ method: 'PATCH', url, body });
      return { data: { ...deck[0], ...body }, headers: {} };
    },
    delete: async (url: string) => {
      calls.push({ method: 'DELETE', url });
      return { data: undefined, headers: {} };
    },
  } as never);
});

async function renderCards() {
  const onChanged = jest.fn();
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <CardsTab pageId="ds" cardsTotal={2} onChanged={onChanged} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.getByTestId('notebook-cards')).toBeTruthy());
  return onChanged;
}

const press = async (testID: string, index = 0) => {
  await act(async () => {
    fireEvent.press(screen.getAllByTestId(testID)[index]);
  });
};

describe('CardsTab', () => {
  it('counts what is due today and opens the review on this page', async () => {
    await renderCards();

    expect(screen.getByText('1 to review today')).toBeTruthy();
    expect(screen.getByText('2 cards on this page')).toBeTruthy();
    await press('notebook-cards-review');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/notebook-review', params: { scope: 'ds' } });
  });

  it('opens the answer under the question on a tap', async () => {
    await renderCards();

    expect(screen.queryByText('Answer to What is a heap?')).toBeNull();
    await press('notebook-card', 1);
    expect(screen.getByText('Answer to What is a heap?')).toBeTruthy();
  });

  it('drafts cards with AI and tells the screen the deck changed', async () => {
    const onChanged = await renderCards();

    await press('notebook-cards-draft');

    expect(calls).toEqual([{ method: 'POST', url: '/notebook/ai/pages/ds/cards', body: { count: 5 } }]);
    expect(notify.success).toHaveBeenCalledWith('2 cards added');
    expect(onChanged).toHaveBeenCalled();
  });

  it('writes a card from its question and answer', async () => {
    const onChanged = await renderCards();

    await press('notebook-cards-write');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('card-front'), ' What is a trie? ');
      fireEvent.changeText(screen.getByTestId('card-back'), 'A tree of prefixes');
    });
    await press('card-save');

    expect(calls).toEqual([{ method: 'POST', url: '/notebook/pages/ds/cards', body: { front: 'What is a trie?', back: 'A tree of prefixes' } }]);
    expect(onChanged).toHaveBeenCalled();
  });

  it('edits a card, and deletes one only after the dialog', async () => {
    await renderCards();

    await press('notebook-card', 0);
    await press('notebook-card-edit');
    expect(screen.getByTestId('card-front').props.value).toBe('Why is array access O(1)?');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('card-back'), 'The address is base plus index times size');
    });
    await press('card-save');
    expect(calls[0]).toEqual({
      method: 'PATCH',
      url: '/notebook/cards/a',
      body: { front: 'Why is array access O(1)?', back: 'The address is base plus index times size' },
    });

    await press('notebook-card-delete');
    expect(calls).toHaveLength(1);
    await press('notebook-card-delete-modal-confirm');
    expect(calls[1]).toEqual({ method: 'DELETE', url: '/notebook/cards/a' });
  });
});
