import { uuidv4 } from '../src/lib/uuid';

const V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('uuidv4 matches RFC4122 v4 format', () => {
  expect(uuidv4()).toMatch(V4_REGEX);
});

test('two uuidv4 calls produce different values', () => {
  expect(uuidv4()).not.toBe(uuidv4());
});
