import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * Which state the focus surface is in.
 *
 * "off" is not a screen, it is the absence of one, and what the slice returns to when the
 * user leaves. The other values are the same screen wearing different clothes: "ultrafoco"
 * narrows to one item and "descanso" (F5) stills the screen. Both are reached WITHOUT
 * changing route, which is the whole reason the mode lives in the store instead of the URL.
 *
 * It earns its keep already in F1: the "enter focus" button reads it to hide itself, so the
 * focus screen can render the ordinary routine card without the card offering a way into the
 * screen it is already inside.
 */
export type FocusMode = "off" | "fullscreen" | "ultrafoco" | "descanso";

type focusState = {
    mode: FocusMode;
    /**
     * Index into `getFocusItems(routine)`. -1 means nothing is selected, which is both the
     * starting state and what an empty or finished routine resolves to.
     */
    selectedIndex: number;
    /**
     * True once the person chose an item by hand.
     *
     * **This is the freedom rule, and it is the whole reason this field exists.** The clock
     * seeds the selection once, through `focusStartResolved`. After a manual choice the clock
     * is never allowed to move it again for this visit, so an item picked at nine in the
     * morning stays put when its window passes, and a routine the person is working through
     * out of order is not dragged back to "now" every minute.
     */
    manuallySelected: boolean;
};

const initialState: focusState = {
    mode: "off",
    selectedIndex: -1,
    manuallySelected: false,
};

/** Clamped, never wrapping. Running off the end of the day should stop, not start over. */
const clamp = (index: number, count: number) => Math.min(Math.max(index, 0), count - 1);

const focusSlice = createSlice({
    name: "focus",
    initialState,
    reducers: {
        /** Entering always lands on the full routine. Narrowing to one item is a later step. */
        focusEntered() {
            return { ...initialState, mode: "fullscreen" as FocusMode };
        },
        focusModeChanged(state, action: PayloadAction<FocusMode>) {
            return { ...state, mode: action.payload };
        },
        /**
         * The clock's suggestion, from `resolveFocusStart`.
         *
         * Ignored outright once the person has chosen by hand. Dispatching this on a timer is
         * therefore safe: it seeds an untouched screen and is inert on a steered one.
         */
        focusStartResolved(state, action: PayloadAction<number>) {
            if (state.manuallySelected) return state;
            return { ...state, selectedIndex: action.payload };
        },
        /** A deliberate choice. Takes the selection away from the clock for good. */
        focusItemSelected(state, action: PayloadAction<number>) {
            return { ...state, selectedIndex: action.payload, manuallySelected: true };
        },
        /**
         * Step forward or back through the day.
         *
         * The count comes in the payload because the reducer has no business knowing the
         * routine; clamping in one place is still better than each platform clamping its own
         * way. Also a manual move: pressing "next" is choosing.
         */
        focusMovedBy(state, action: PayloadAction<{ delta: number; count: number }>) {
            const { delta, count } = action.payload;
            if (count <= 0) return state;
            const from = state.selectedIndex < 0 ? 0 : state.selectedIndex;
            return {
                ...state,
                selectedIndex: clamp(from + delta, count),
                manuallySelected: true,
            };
        },
        /**
         * Resets the WHOLE slice rather than only the mode. Every field the later phases add
         * (timer, session micro-tasks) is scoped to one visit, so leaving has to forget all of
         * it. Written this way so a field added in F3 does not quietly survive an exit.
         */
        focusExited() {
            return initialState;
        },
    },
});

export const {
    focusEntered,
    focusModeChanged,
    focusStartResolved,
    focusItemSelected,
    focusMovedBy,
    focusExited,
} = focusSlice.actions;
export default focusSlice.reducer;
