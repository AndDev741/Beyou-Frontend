/**
 * Persists AI-onboarding wizard progress across app restarts (SecureStore twin
 * of the web aiOnboardingStorage). Entities are created for real at each step,
 * so losing the step + created refs would restart the wizard and duplicate
 * data. Suggestions are NOT persisted — the resumed step simply re-fetches
 * fresh ones.
 */
import * as SecureStore from 'expo-secure-store';

export type WizardStep = 'categories' | 'habitsTasks' | 'routine' | 'goals' | 'summary';

export type CreatedRef = { id: string; name: string };

export type StoredWizardProgress = {
  step: WizardStep;
  data: {
    categories: CreatedRef[];
    habits: CreatedRef[];
    tasks: CreatedRef[];
    routineName?: string;
    goals: CreatedRef[];
    freeTexts: string[];
  };
};

const STORAGE_KEY = 'beyou.aiOnboarding.progress';

const STEPS: WizardStep[] = ['categories', 'habitsTasks', 'routine', 'goals', 'summary'];

const isRefArray = (value: unknown): value is CreatedRef[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as CreatedRef).id === 'string' &&
      typeof (item as CreatedRef).name === 'string'
  );

export async function loadWizardProgress(): Promise<StoredWizardProgress | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWizardProgress;
    if (!STEPS.includes(parsed?.step)) return null;
    const d = parsed.data;
    if (
      !d ||
      !isRefArray(d.categories) ||
      !isRefArray(d.habits) ||
      !isRefArray(d.tasks) ||
      !isRefArray(d.goals) ||
      !Array.isArray(d.freeTexts) ||
      !d.freeTexts.every((f) => typeof f === 'string')
    ) {
      return null;
    }
    // Every step past the first depends on already-created categories;
    // an inconsistent snapshot restarts cleanly instead of resuming broken.
    if (parsed.step !== 'categories' && d.categories.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveWizardProgress(progress: StoredWizardProgress): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage full/blocked — resuming is best-effort
  }
}

export async function clearWizardProgress(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // ignore
  }
}
