import * as SecureStore from 'expo-secure-store';

/**
 * Seções recolhidas por dia: { "2026-08-04": ["seção-a", "seção-b"] }.
 *
 * Mesmo contrato do `beyou-routine-collapsed` da web. Amanhã a seção abre como
 * nova — recolher é uma decisão sobre o dia de hoje, não uma preferência
 * permanente.
 */
const KEY = 'beyou.routineCollapsed';

type CollapsedMap = Record<string, string[]>;

async function read(): Promise<CollapsedMap> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CollapsedMap) : {};
  } catch {
    return {};
  }
}

/** Ids recolhidos de um dia. Best-effort: sem storage, nada vem recolhido. */
export async function loadCollapsedSections(date: string): Promise<string[]> {
  return (await read())[date] ?? [];
}

/** Best-effort: sem persistência a escolha vale só nesta sessão. */
export async function saveCollapsedSection(
  date: string,
  sectionId: string,
  collapsed: boolean,
): Promise<void> {
  try {
    const map = await read();
    const list = (map[date] ?? []).filter((id) => id !== sectionId);
    if (collapsed) list.push(sectionId);
    map[date] = list;
    await SecureStore.setItemAsync(KEY, JSON.stringify(map));
  } catch {
    // swallow — preferência de tela não é dado crítico
  }
}
