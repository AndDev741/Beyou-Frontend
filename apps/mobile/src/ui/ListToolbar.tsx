import type { ReactNode } from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  /** The selects (sorting, category) — they go on the second row, side by side. */
  children?: ReactNode;
  testID?: string;
}

/**
 * A list's search and filters, in the web's design.
 *
 * The search takes the whole row and the filters drop to the one below: all three
 * together squeezed the search down to just the magnifier on a 360px screen.
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
