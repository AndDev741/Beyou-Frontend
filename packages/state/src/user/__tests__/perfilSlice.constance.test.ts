import { describe, it, expect } from 'vitest';
import perfilReducer, {
    alreadyIncreaseConstanceTodayEnter,
} from '../perfilSlice';

// Get the initial state by dispatching an unknown action
const initialState = perfilReducer(undefined, { type: '@@INIT' });

describe('perfilSlice - alreadyIncreaseConstanceTodayEnter', () => {
    it('has false as the default value for alreadyIncreaseConstanceToday', () => {
        expect(initialState.alreadyIncreaseConstanceToday).toBe(false);
    });

    it('updates alreadyIncreaseConstanceToday to true', () => {
        const state = perfilReducer(initialState, alreadyIncreaseConstanceTodayEnter(true));
        expect(state.alreadyIncreaseConstanceToday).toBe(true);
    });

    it('updates alreadyIncreaseConstanceToday back to false', () => {
        const stateTrue = perfilReducer(initialState, alreadyIncreaseConstanceTodayEnter(true));
        const stateFalse = perfilReducer(stateTrue, alreadyIncreaseConstanceTodayEnter(false));
        expect(stateFalse.alreadyIncreaseConstanceToday).toBe(false);
    });

    it('does NOT create a phantom alreadyIncreaseConstance key', () => {
        const state = perfilReducer(initialState, alreadyIncreaseConstanceTodayEnter(true));
        expect(state).not.toHaveProperty('alreadyIncreaseConstance');
    });

    it('preserves other state fields when updating alreadyIncreaseConstanceToday', () => {
        const stateWithName = perfilReducer(initialState, { type: 'perfil/nameEnter', payload: 'Andre' });
        const stateAfter = perfilReducer(stateWithName, alreadyIncreaseConstanceTodayEnter(true));

        expect(stateAfter.alreadyIncreaseConstanceToday).toBe(true);
        expect(stateAfter.username).toBe('Andre');
    });
});
