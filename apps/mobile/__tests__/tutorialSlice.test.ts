import reducer, { setPhase, clearPhase } from '../src/tutorial/tutorialSlice';

describe('tutorialSlice', () => {
  it('defaults to null phase', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({ phase: null });
  });
  it('setPhase stores the phase', () => {
    expect(reducer({ phase: null }, setPhase('intro'))).toEqual({ phase: 'intro' });
  });
  it('clearPhase resets to null', () => {
    expect(reducer({ phase: 'categories' }, clearPhase())).toEqual({ phase: null });
  });
});
