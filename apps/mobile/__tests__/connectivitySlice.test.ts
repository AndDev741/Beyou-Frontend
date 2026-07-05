import reducer, { dismissBanner, setOnline, setPendingOps } from '../src/offline/connectivitySlice';

const initial = reducer(undefined, { type: '@@init' });

test('starts unknown, not dismissed, zero pending', () => {
  expect(initial).toEqual({ isOnline: null, bannerDismissed: false, pendingOps: 0 });
});

test('going offline starts a new episode (banner shown again)', () => {
  let s = reducer(initial, setOnline(true));
  s = reducer(s, setOnline(false));
  s = reducer(s, dismissBanner());
  expect(s.bannerDismissed).toBe(true);
  s = reducer(s, setOnline(true));   // back online
  s = reducer(s, setOnline(false));  // NEW offline episode
  expect(s.bannerDismissed).toBe(false);
});

test('staying offline does not resurrect a dismissed banner', () => {
  let s = reducer(initial, setOnline(false));
  s = reducer(s, dismissBanner());
  s = reducer(s, setOnline(false)); // repeated offline reports, same episode
  expect(s.bannerDismissed).toBe(true);
});

test('setPendingOps stores the outbox count', () => {
  expect(reducer(initial, setPendingOps(3)).pendingOps).toBe(3);
});
