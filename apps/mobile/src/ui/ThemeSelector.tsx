import { View, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { accentPacks, serializeThemePreference, type ThemeMode } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

const MODES: { value: ThemeMode; labelKey: string }[] = [
  { value: 'system', labelKey: 'ThemeModeSystem' },
  { value: 'light', labelKey: 'ThemeModeLight' },
  { value: 'dark', labelKey: 'ThemeModeDark' },
];

/**
 * Aparência = modo + pack de acento (espelha o seletor da web). `onSelect`
 * recebe a preferência serializada ("dark:cyber") para o chamador persistir
 * via editUser.
 */
export default function ThemeSelector({ onSelect }: { onSelect?: (mode: string) => void }) {
  const { t } = useTranslation();
  const { theme, preference, setPreference } = useBeyouTheme();

  const apply = (next: { mode: ThemeMode; accentPack: string }) => {
    setPreference(next);
    onSelect?.(serializeThemePreference(next));
  };

  return (
    <View className="w-full mt-3" testID="theme-selector">
      <Text className="mb-2 text-sm font-semibold text-text-2">{t('ThemeMode')}</Text>
      <View className="flex-row rounded-control bg-surface-2 p-1">
        {MODES.map(({ value, labelKey }) => {
          const isActive = preference.mode === value;
          return (
            <Pressable
              key={value}
              onPress={() => apply({ ...preference, mode: value })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              testID={`theme-mode-${value}`}
              className={`flex-1 items-center rounded-lg py-2 ${isActive ? 'bg-surface' : ''}`}
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-text' : 'text-text-2'}`}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-2 mt-4 text-sm font-semibold text-text-2">{t('ThemeAccent')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {accentPacks.map((pack) => {
          const isActive = preference.accentPack === pack.id;
          return (
            <Pressable
              key={pack.id}
              onPress={() => apply({ ...preference, accentPack: pack.id })}
              accessibilityRole="button"
              accessibilityLabel={t(pack.labelKey)}
              accessibilityState={{ selected: isActive }}
              testID={`theme-accent-${pack.id}`}
              className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${
                isActive ? 'border-accent bg-accent-soft' : 'border-border'
              }`}
            >
              <View
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: pack.accent[theme.base] }}
              />
              <Text className={`text-sm ${isActive ? 'text-text' : 'text-text-2'}`}>
                {t(pack.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-3 text-xs text-text-3">{t('ThemeHint')}</Text>
    </View>
  );
}
