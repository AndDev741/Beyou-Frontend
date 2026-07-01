import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useTutorialTarget } from '../../tutorial/useTutorialTarget';

type NavItemConfig = { key: string; route: string; icon: keyof typeof Ionicons.glyphMap; emphasis?: boolean; targetId?: string };

// Always-visible bottom action bar. Order per product: Categories, Tasks,
// Habits, Routines, Goals, Config — with Habits + Routines emphasized (filled).
const ITEMS: NavItemConfig[] = [
  { key: 'Categories', route: '/categories', icon: 'folder-outline', targetId: 'nav-categories' },
  { key: 'Tasks', route: '/tasks', icon: 'checkbox-outline' },
  { key: 'Habits', route: '/habits', icon: 'repeat', emphasis: true, targetId: 'nav-habits' },
  { key: 'Routines', route: '/routines', icon: 'calendar', emphasis: true, targetId: 'nav-routines' },
  { key: 'Goals', route: '/goals', icon: 'trophy-outline' },
  { key: 'Config', route: '/configuration', icon: 'settings-outline', targetId: 'nav-config' },
];

// Extracted component so each item can conditionally call useTutorialTarget
// without violating the Rules of Hooks (hooks cannot be called inside .map()).
function NavItemButton({ item, theme }: { item: NavItemConfig; theme: ReturnType<typeof useBeyouTheme>['theme'] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const ref = useTutorialTarget(item.targetId ?? '');
  const emphasized = item.emphasis === true;
  return (
    <Pressable
      ref={item.targetId ? ref : undefined}
      key={item.key}
      onPress={() => router.push(item.route)}
      accessibilityRole="button"
      accessibilityLabel={t(item.key)}
      testID={`nav-${item.key.toLowerCase()}`}
      className={`items-center justify-center rounded-2xl px-2 py-1.5 ${emphasized ? 'bg-primary' : ''}`}
    >
      <Ionicons
        name={item.icon}
        size={emphasized ? 24 : 22}
        color={emphasized ? theme.background : theme.icon}
      />
      <Text
        className="mt-0.5 text-[10px] font-semibold"
        style={{ color: emphasized ? theme.background : theme.secondary }}
        numberOfLines={1}
      >
        {t(item.key)}
      </Text>
    </Pressable>
  );
}

export default function BottomNav() {
  const { theme } = useBeyouTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="bottom-nav"
      className="flex-row items-end justify-around border-t border-primary/15 bg-background px-1 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {ITEMS.map((item) => (
        <NavItemButton key={item.key} item={item} theme={theme} />
      ))}
    </View>
  );
}
