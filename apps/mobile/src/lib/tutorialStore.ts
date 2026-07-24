import * as SecureStore from 'expo-secure-store';
import type { TutorialPhase } from '../tutorial/tutorialSlice';

const KEY = 'beyou.tutorial.phase';
const PHASES: TutorialPhase[] = ['intro', 'ai', 'dashboard', 'categories', 'habits', 'routines', 'config', 'done'];

export async function loadTutorialPhase(): Promise<TutorialPhase | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw && (PHASES as string[]).includes(raw) ? (raw as TutorialPhase) : null;
  } catch {
    return null;
  }
}

export async function saveTutorialPhase(phase: TutorialPhase | null): Promise<void> {
  try {
    if (phase) await SecureStore.setItemAsync(KEY, phase);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // best-effort; a failed write just resets the tutorial next launch
  }
}
