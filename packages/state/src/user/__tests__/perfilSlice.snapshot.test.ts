import { describe, it, expect } from 'vitest';
import perfilReducer, {
    timezoneEnter,
    xpDecayStrategyEnter,
} from '../perfilSlice';

// Get the initial state by dispatching an unknown action
const initialState = perfilReducer(undefined, { type: '@@INIT' });

describe('perfilSlice - snapshot-related fields', () => {
    // -----------------------------------------------------------------------
    // Default values
    // -----------------------------------------------------------------------
    describe('default values', () => {
        it('has "UTC" as the default timezone', () => {
            expect(initialState.timezone).toBe('UTC');
        });

        it('has "GRADUAL" as the default xpDecayStrategy', () => {
            expect(initialState.xpDecayStrategy).toBe('GRADUAL');
        });
    });

    // -----------------------------------------------------------------------
    // timezoneEnter
    // -----------------------------------------------------------------------
    describe('timezoneEnter', () => {
        it('updates the timezone to the provided value', () => {
            const state = perfilReducer(initialState, timezoneEnter('America/Sao_Paulo'));
            expect(state.timezone).toBe('America/Sao_Paulo');
        });

        it('sets a different timezone value', () => {
            const state = perfilReducer(initialState, timezoneEnter('Asia/Tokyo'));
            expect(state.timezone).toBe('Asia/Tokyo');
        });

        it('falls back to "UTC" when a non-string value is provided', () => {
            const state = perfilReducer(initialState, timezoneEnter(null));
            expect(state.timezone).toBe('UTC');
        });

        it('falls back to "UTC" when undefined is provided', () => {
            const state = perfilReducer(initialState, timezoneEnter(undefined));
            expect(state.timezone).toBe('UTC');
        });

        it('falls back to "UTC" when a number is provided', () => {
            const state = perfilReducer(initialState, timezoneEnter(42));
            expect(state.timezone).toBe('UTC');
        });

        it('preserves other state fields when updating timezone', () => {
            const stateWithName = perfilReducer(initialState, { type: 'perfil/nameEnter', payload: 'John' });
            const stateAfterTimezone = perfilReducer(stateWithName, timezoneEnter('Europe/London'));

            expect(stateAfterTimezone.timezone).toBe('Europe/London');
            expect(stateAfterTimezone.username).toBe('John');
        });
    });

    // -----------------------------------------------------------------------
    // xpDecayStrategyEnter
    // -----------------------------------------------------------------------
    describe('xpDecayStrategyEnter', () => {
        it('updates the xpDecayStrategy to GRADUAL', () => {
            const state = perfilReducer(
                { ...initialState, xpDecayStrategy: 'FLAT' },
                xpDecayStrategyEnter('GRADUAL'),
            );
            expect(state.xpDecayStrategy).toBe('GRADUAL');
        });

        it('updates the xpDecayStrategy to FLAT', () => {
            const state = perfilReducer(initialState, xpDecayStrategyEnter('FLAT'));
            expect(state.xpDecayStrategy).toBe('FLAT');
        });

        it('updates the xpDecayStrategy to TIME_WINDOW', () => {
            const state = perfilReducer(initialState, xpDecayStrategyEnter('TIME_WINDOW'));
            expect(state.xpDecayStrategy).toBe('TIME_WINDOW');
        });

        it('falls back to "GRADUAL" for an invalid strategy string', () => {
            const state = perfilReducer(initialState, xpDecayStrategyEnter('INVALID'));
            expect(state.xpDecayStrategy).toBe('GRADUAL');
        });

        it('falls back to "GRADUAL" for null', () => {
            const state = perfilReducer(initialState, xpDecayStrategyEnter(null));
            expect(state.xpDecayStrategy).toBe('GRADUAL');
        });

        it('falls back to "GRADUAL" for undefined', () => {
            const state = perfilReducer(initialState, xpDecayStrategyEnter(undefined));
            expect(state.xpDecayStrategy).toBe('GRADUAL');
        });

        it('preserves other state fields when updating xpDecayStrategy', () => {
            const stateWithEmail = perfilReducer(initialState, { type: 'perfil/emailEnter', payload: 'test@x.com' });
            const stateAfterDecay = perfilReducer(stateWithEmail, xpDecayStrategyEnter('TIME_WINDOW'));

            expect(stateAfterDecay.xpDecayStrategy).toBe('TIME_WINDOW');
            expect(stateAfterDecay.email).toBe('test@x.com');
        });
    });
});
