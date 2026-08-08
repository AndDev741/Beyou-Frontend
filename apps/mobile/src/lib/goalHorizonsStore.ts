import * as SecureStore from 'expo-secure-store';

/**
 * Quais horizontes de meta ficam visíveis no dashboard. Mesmo contrato do
 * `beyou-goal-horizons` da web: quem só se importa com a semana não quer
 * refiltrar todo dia.
 */
const KEY = 'beyou.goalHorizons';

export async function loadGoalHorizons(): Promise<string[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

/** Best-effort: sem persistência a escolha vale só nesta sessão. */
export async function saveGoalHorizons(keys: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(keys));
  } catch {
    // swallow — preferência de tela não é dado crítico
  }
}
