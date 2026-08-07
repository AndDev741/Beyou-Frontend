import * as SecureStore from 'expo-secure-store';

// Mesma escolha do viewFiltersStore: reaproveita o expo-secure-store já
// instalado em vez de trazer AsyncStorage (dependência nativa nova ⇒ rebuild).
// O valor é uma flag de uma letra por chave.
const PREFIX = 'beyou.dismissed.';

/** Lê a recusa. Best-effort: falha de leitura vale como "ainda não recusou". */
export async function loadDismissed(key: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(PREFIX + key)) === '1';
  } catch {
    return false;
  }
}

/** Best-effort: sem persistência o convite volta no próximo início. */
export async function saveDismissed(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREFIX + key, '1');
  } catch {
    // swallow — preferência de tela não é dado crítico
  }
}
