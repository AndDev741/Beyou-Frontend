import { expect, test } from 'vitest';
import { localDateKey } from '../date';

test('formats a local date as YYYY-MM-DD with zero padding', () => {
  expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
});
