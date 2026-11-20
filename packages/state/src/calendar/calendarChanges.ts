/**
 * "The calendar changed somewhere else, read it again."
 *
 * The Calendar screen and the today widget each hold the range they fetched in local state, by
 * design (no slice, see `useCalendarOverview`), and apply their own writes to it. The assistant
 * writes from outside both: it can put a task on the calendar while the screen is open under
 * the chat. When its turn reports the `calendar` domain, the agent refresh announces it here and
 * whoever is showing calendar data refetches its own range.
 *
 * A plain listener set rather than window events, because mobile has no `window` to dispatch on
 * and both apps should hear the same thing the same way.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function announceCalendarChange(): void {
  // A copy, so a listener that unsubscribes while being called does not skip its neighbour.
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      /* one screen failing to refetch must not stop the others */
    }
  }
}

/** Subscribes until the returned function is called. */
export function onCalendarChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
