/**
 * The review session on a phone: show the answer, rate it, and when the queue runs out the
 * session is finished on the server, which is what pays the XP.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import NotebookReviewScreen from '../app/notebook-review';

const due = {
  cards: [
    {
      id: 'c1', pageId: 'p', pageTitle: 'Trees', topicId: 't', topicTitle: 'Data Structures',
      front: 'Which node replaces a deleted node with two children?', back: 'Its in-order successor.',
      sourceLabel: 'CLRS p. 296', intervals: { AGAIN: 0, HARD: 2, GOOD: 4, EASY: 9 },
    },
  ],
  total: 1,
  streak: 6,
};

let posts: string[] = [];

beforeEach(() => {
  posts = [];
  setLogger({ error: () => {} });
  setHttpClient({
    get: async () => ({ data: due, headers: {} }),
    post: async (url: string) => {
      posts.push(url);
      if (url.endsWith('/review')) {
        return { data: { cardId: 'c1', dueOn: '2026-10-08', intervalDays: 4, dueAgainToday: false }, headers: {} };
      }
      return { data: { paidReviews: 1, xpEarned: 1, streak: 7, refreshUi: null }, headers: {} };
    },
    put: async () => ({ data: {}, headers: {} }),
    patch: async () => ({ data: {}, headers: {} }),
    delete: async () => ({ data: {}, headers: {} }),
  } as never);
});

async function renderReview() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <NotebookReviewScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

describe('NotebookReviewScreen', () => {
  it('shows the front, then the answer, then finishes the session once the queue is empty', async () => {
    await renderReview();

    await waitFor(() => expect(screen.getByTestId('notebook-review-front')).toBeTruthy());
    expect(screen.queryByTestId('notebook-review-back')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-review-show'));
    });
    expect(screen.getByTestId('notebook-review-back')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-review-rate-GOOD'));
    });

    await waitFor(() => expect(screen.getByTestId('notebook-review-summary')).toBeTruthy());
    expect(posts).toEqual(['/notebook/cards/c1/review', '/notebook/reviews/finish']);
  });

  /** Closing mid-session still ends it, so the answers given are paid. */
  it('closing after an answer finishes the session; closing before any does not', async () => {
    await renderReview();
    await waitFor(() => expect(screen.getByTestId('notebook-review-front')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-review-close'));
    });

    expect(posts).toEqual([]);
    expect(mockBack).toHaveBeenCalled();
  });
});
