import { View, Pressable } from 'react-native';
import { themes } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

/**
 * Inline theme swatch picker, mirroring the web `authentication/ThemeSelectorInline`.
 * Pre-auth this only switches the live theme (no backend persistence — the user
 * isn't logged in yet). Each swatch is a circle split background / primary.
 */
export default function ThemeSelector() {
  const { theme, setThemeByMode } = useBeyouTheme();

  return (
    <View className="w-full items-center mt-3" testID="theme-selector">
      <View className="flex-row flex-wrap justify-center gap-3">
        {themes.map((item) => {
          const isActive = theme.mode === item.mode;
          return (
            <Pressable
              key={item.mode}
              onPress={() => setThemeByMode(item.mode)}
              accessibilityRole="button"
              accessibilityLabel={item.mode}
              accessibilityState={{ selected: isActive }}
              testID={`theme-swatch-${item.mode}`}
              className={`rounded-full p-0.5 ${isActive ? 'border-2 border-primary' : ''}`}
            >
              <View
                className="h-7 w-7 flex-row overflow-hidden rounded-full border"
                style={{ borderColor: item.primary }}
              >
                <View className="flex-1" style={{ backgroundColor: item.background }} />
                <View className="flex-1" style={{ backgroundColor: item.primary }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
