import { defaultLight } from '@beyou/theme';

describe('shared package wiring', () => {
  it('resolves @beyou/theme from the mobile app', () => {
    expect(defaultLight.mode).toBe('beYou');
    expect(defaultLight.primary).toMatch(/^#/);
  });
});
