import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import SpotlightOverlay from '../ui/tutorial/SpotlightOverlay';
import type { SpotlightStep } from './steps/types';

/**
 * One overlay slot for the whole authenticated app.
 *
 * WHY A SLOT. Spotlight targets are measured with `measureInWindow`, so every
 * rect the overlay draws with is window-absolute. The overlay is therefore only
 * correct while it fills the window. Since `BottomNav` moved into the (app)
 * layout, a screen no longer does: it spans the window MINUS the bar, and
 * `nav-categories` — the dashboard tutorial's second target — lives inside the
 * bar, outside any screen. The overlay has to be hoisted to the layout, beside
 * the bar.
 *
 * It still cannot be a `Modal` (a separate window swallows the taps that are
 * supposed to fall through the hole — see SpotlightOverlay's own note), and the
 * layout must not run the five per-screen tutorial hooks itself: each owns
 * screen-specific behaviour (`useRoutinesTutorial` auto-advances once a routine
 * exists, and so on), and running them all would fire effects for screens that
 * are not mounted.
 *
 * So the screen keeps deciding WHAT to show and the layout decides WHERE:
 * `TutorialOverlayHost` wraps the layout's children and renders the overlay
 * after them; `useSpotlightSlot` publishes the active screen's controller into
 * it. Because `children` is the same element on every host re-render, publishing
 * re-renders only the overlay — never the screens — so there is no feedback loop.
 *
 * OWNERSHIP: last writer wins, with owner-scoped clears. Two screens are briefly
 * mounted together during a navigation, so a publish from the incoming screen
 * takes the slot immediately, and the outgoing screen's cleanup only clears the
 * slot if it still holds it. (Phases are mutually exclusive — `active` gates on
 * `phase === '<screen>'` — so a genuine two-owner conflict cannot arise; the
 * tie-break exists to make the hand-off order-independent.)
 */

/** The shape all five per-screen tutorial hooks return. */
export interface SpotlightController {
  active: boolean;
  steps: SpotlightStep[];
  stepIndex: number;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

interface SlotEntry {
  ownerId: string;
  step: SpotlightStep;
  stepIndex: number;
  stepCount: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

type Publication = Omit<SlotEntry, 'ownerId'>;

interface SlotApi {
  publish: (ownerId: string, publication: Publication | null) => void;
}

const SlotContext = createContext<SlotApi | null>(null);
// Keeps screens renderable outside the (app) layout (unit tests, storybook-style
// harnesses): publishing simply goes nowhere.
const NOOP: SlotApi = { publish: () => {} };

/**
 * Shallow content comparison rather than a hand-listed field check: several
 * hooks rebuild their `steps` array every render (`useRoutinesTutorial` stamps
 * `disabled` onto the `add` step), so identity says "changed" when nothing did.
 * Deriving the keys means a future field on SpotlightStep is compared for free.
 */
const sameStep = (a: SpotlightStep, b: SpotlightStep): boolean => {
  if (a === b) return true;
  const keys = Object.keys(a) as (keyof SpotlightStep)[];
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
};

const sameEntry = (entry: SlotEntry, ownerId: string, next: Publication): boolean =>
  entry.ownerId === ownerId
  && entry.stepIndex === next.stepIndex
  && entry.stepCount === next.stepCount
  && entry.onNext === next.onNext
  && entry.onPrev === next.onPrev
  && entry.onSkip === next.onSkip
  && sameStep(entry.step, next.step);

/**
 * Mounts the overlay slot. Renders `children` untouched and the overlay after
 * them, so the overlay is the last sibling in the layout root: full-window
 * coordinate space, painted over the bottom bar.
 */
export function TutorialOverlayHost({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<SlotEntry | null>(null);
  // A screen's cleanup runs before the layout's, but an outer unmount can still
  // reverse that; the guard keeps a late publish from touching dead state.
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const api = useMemo<SlotApi>(() => ({
    publish: (ownerId, publication) => {
      if (!live.current) return;
      setEntry((prev) => {
        // Clearing: only the current owner may empty the slot, so an outgoing
        // screen cannot wipe an overlay the incoming one already published.
        if (publication === null) return prev && prev.ownerId !== ownerId ? prev : null;
        // Same owner, same content — return `prev` so React bails out entirely.
        if (prev && sameEntry(prev, ownerId, publication)) return prev;
        return { ownerId, ...publication };
      });
    },
  }), []);

  return (
    <SlotContext.Provider value={api}>
      {children}
      {entry ? (
        <SpotlightOverlay
          step={entry.step}
          stepIndex={entry.stepIndex}
          stepCount={entry.stepCount}
          onNext={entry.onNext}
          onPrev={entry.onPrev}
          onSkip={entry.onSkip}
        />
      ) : null}
    </SlotContext.Provider>
  );
}

let publisherSeq = 0;

/**
 * Publishes a screen's tutorial controller into the layout's overlay slot.
 * Replaces the screen's own `<SpotlightOverlay/>` render: call it unconditionally
 * (an inactive controller publishes nothing) and the overlay appears in the
 * layout, spanning the window.
 */
export function useSpotlightSlot(controller: SpotlightController): void {
  const { publish } = useContext(SlotContext) ?? NOOP;

  const idRef = useRef('');
  if (!idRef.current) {
    publisherSeq += 1;
    idRef.current = `spotlight-publisher-${publisherSeq}`;
  }
  const id = idRef.current;

  // The controller's identity churns every render (the hooks rebuild their
  // handlers), so the published handlers read it at press time instead. Declared
  // FIRST so it is refreshed before the publishing effect below runs.
  const latest = useRef(controller);
  useEffect(() => { latest.current = controller; });

  const onNext = useCallback(() => latest.current.next(), []);
  const onPrev = useCallback(() => latest.current.prev(), []);
  const onSkip = useCallback(() => latest.current.skip(), []);

  const step = controller.active ? controller.steps[controller.stepIndex] : undefined;
  const { stepIndex } = controller;
  const stepCount = controller.steps.length;

  // Intentionally dependency-free: the values that matter are compared by
  // content in the host, which bails out when nothing changed. A dependency list
  // here would have to re-list every SpotlightStep field to stay correct.
  useEffect(() => {
    publish(id, step ? { step, stepIndex, stepCount, onNext, onPrev, onSkip } : null);
  });

  useEffect(() => () => publish(id, null), [publish, id]);
}
