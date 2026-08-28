import { RoutineSection } from '@beyou/types/routine/routineSection';
import { isOvernightRange } from '@beyou/validation';
// Both helpers used to be defined here. They moved to `minutes.ts` when the focus resolver
// needed the identical arithmetic, because a second copy of midnight handling is how the two
// would drift apart.
import { fromMinutes, toMinutes } from './minutes';

/**
 * Times suggested in sequence inside the section's window.
 *
 * The old form asked for start and end BEFORE picking the item, one at a time.
 * The section already defines the window: picked items split what is left of
 * it, in order, and every row stays editable afterwards — correcting a
 * suggested time beats typing two from scratch.
 *
 * Returns `[]` when there is no room left, so callers fall back to empty times
 * instead of an inverted range.
 */
export function suggestSlots(
    section: RoutineSection,
    count: number
): { startTime: string; endTime?: string }[] {
    if (count <= 0 || !section.startTime) return [];

    const overnight = isOvernightRange(section.startTime, section.endTime);
    const sectionStart = toMinutes(section.startTime);
    const sectionEnd = section.endTime
        ? toMinutes(section.endTime) + (overnight ? 1440 : 0)
        : undefined;

    // Resume where the items already in the section stopped.
    const existingEnds = [...(section.habitGroup ?? []), ...(section.taskGroup ?? [])].map((item) => {
        const end = item.endTime || item.startTime;
        if (!end) return sectionStart;
        const value = toMinutes(end);
        return overnight && value < sectionStart ? value + 1440 : value;
    });
    const cursor = existingEnds.length > 0 ? Math.max(sectionStart, ...existingEnds) : sectionStart;

    // The window is already full: an item that runs past the section end left
    // no room. Only `end` used to be clamped, so the cursor could sit beyond
    // `sectionEnd` and the suggestion came out backwards — 09:10 to 09:00.
    if (sectionEnd !== undefined && cursor >= sectionEnd) return [];

    // With no section end, each item gets 15 minutes in a queue.
    const DEFAULT_SLOT = 15;
    const remaining = sectionEnd !== undefined ? Math.max(sectionEnd - cursor, 0) : undefined;
    // Splitting what is left only makes sense when you know HOW MANY items come
    // in together. Picked one at a time (which is how both screens work today),
    // dividing by 1 would hand the whole window to the first and leave zero for
    // the next — so a lone item takes the default slice, capped by what remains.
    const slot =
        remaining === undefined
            ? DEFAULT_SLOT
            : count > 1
              ? Math.max(Math.floor(remaining / count), 1)
              : Math.max(Math.min(DEFAULT_SLOT, remaining), 1);

    return Array.from({ length: count }, (_, i) => {
        const start = cursor + slot * i;
        const end = sectionEnd !== undefined ? Math.min(start + slot, sectionEnd) : start + slot;
        return { startTime: fromMinutes(start), endTime: fromMinutes(end) };
    });
}
