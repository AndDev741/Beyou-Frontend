import * as SecureStore from 'expo-secure-store';
import type { MicroTask } from '@beyou/state';
import { MAX_MICRO_TASKS, persistableMicroTasks } from '@beyou/state';

/**
 * The standing micro-tasks, on this device.
 *
 * Same contract as the web's `beyou-focus-micro-tasks`, and the same reasoning: a break filler is
 * not worth a Beyou `Task` (whose DTO demands an icon, an importance and a difficulty, and which
 * would then live on the Tasks page carrying XP). F6 is where these reach the server.
 *
 * The whole list shares ONE SecureStore value, which caps at around 2048 bytes — the same limit
 * that silently broke the routine-collapsed map once it kept every day forever. `MAX_MICRO_TASKS`
 * and the name length bound in `@beyou/state` are what keep this inside it.
 */
const KEY = 'beyou.focusMicroTasks';

export async function loadMicroTasks(): Promise<MicroTask[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validated field by field: a half-written entry must not reach the reducer and crash a
    // render.
    return parsed
      .filter(
        (entry): entry is MicroTask =>
          Boolean(entry) &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          entry.name.length > 0,
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        pinned: true,
        doneOn: typeof entry.doneOn === 'string' ? entry.doneOn : null,
      }))
      .slice(0, MAX_MICRO_TASKS);
  } catch {
    return [];
  }
}

/** Best-effort. Writes only the standing ones, without a tick from another day. */
export async function saveMicroTasks(tasks: MicroTask[], date: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(persistableMicroTasks(tasks, date)));
  } catch {
    // swallow — a break checklist is not critical data
  }
}
