import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBeyouTheme } from '../../theme/ThemeProvider';

type Shortcut = { key: string; route: string; icon: keyof typeof Ionicons.glyphMap };

// Mirrors the web dashboard Shortcuts (categories/habits/tasks/routines/goals/config).
// Targets are stub screens for now — the real section screens are future phases.
const SHORTCUTS: Shortcut[] = [
  { key: 'Categories', route: '/categories', icon: 'folder-outline' },
  { key: 'Habits', route: '/habits', icon: 'repeat-outline' },
  { key: 'Tasks', route: '/tasks', icon: 'checkbox-outline' },
  { key: 'Routines', route: '/routines', icon: 'calendar-outline' },
  { key: 'Goals', route: '/goals', icon: 'trophy-outline' },
  { key: 'Config', route: '/configuration', icon: 'settings-outline' },
];

export default function Shortcuts() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();

  return (
    <View testID="shortcuts">
      <Text className="text-secondary mb-3 text-xl font-semibold">{t('Shortcuts')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {SHORTCUTS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => router.push(s.route)}
            accessibilityRole="button"
            accessibilityLabel={t(s.key)}
            testID={`shortcut-${s.key.toLowerCase()}`}
            className="flex-row items-center rounded-md border border-primary bg-background px-4 py-3 active:bg-primary/10"
            style={{ minWidth: 150 }}
          >
            <Ionicons name={s.icon} size={22} color={theme.icon} style={{ marginRight: 8 }} />
            <Text className="text-secondary text-base font-semibold">{t(s.key)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
