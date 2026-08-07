import type { ReactNode } from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  /** Os selects (ordenação, categoria) — vão na segunda linha, lado a lado. */
  children?: ReactNode;
  testID?: string;
}

/**
 * Busca e filtros de uma listagem, no mesmo desenho da web.
 *
 * A busca fica com a linha inteira e os filtros descem para a de baixo: os
 * três juntos espremiam a busca até sobrar só a lupa numa tela de 360px.
 */
export default function ListToolbar({
  search,
  onSearchChange,
  searchLabel,
  children,
  testID,
}: ListToolbarProps) {
  const { theme } = useBeyouTheme();

  return (
    <View className="mb-3 gap-2" testID={testID}>
      <View className="flex-row items-center gap-2 rounded-control border border-border bg-surface px-3">
        <Search size={16} color={theme.text3} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchLabel}
          placeholderTextColor={theme.text3}
          accessibilityLabel={searchLabel}
          testID={testID ? `${testID}-search` : 'list-search'}
          className="min-w-0 flex-1 py-2.5 text-[13.5px] text-text"
        />
      </View>
      {children ? <View className="flex-row gap-2">{children}</View> : null}
    </View>
  );
}
