import { View, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

const ON_PRIMARY = '#FFFFFF';
const LANGS = ['en', 'pt'] as const;

/**
 * EN | PT language switch, mirroring the web `translationButton`. Always switches
 * the live i18n language; `onSelect` lets a caller (e.g. the config Preferences
 * section) also persist the choice to the backend. Pre-auth it's used without
 * `onSelect`, so the switch is ephemeral.
 */
export default function LanguageToggle({
  onSelect,
}: {
  onSelect?: (lng: 'en' | 'pt') => void;
} = {}) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('pt') ? 'pt' : 'en';

  return (
    <View className="mt-3 flex-row items-center justify-center" testID="language-toggle">
      {LANGS.map((lng) => {
        const active = current === lng;
        return (
          <Pressable
            key={lng}
            onPress={() => {
              if (current !== lng) i18n.changeLanguage(lng);
              onSelect?.(lng);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`lang-${lng}`}
            className={`border-2 border-primary px-4 py-1.5 ${active ? 'bg-primary' : ''}`}
          >
            <Text
              className={`text-base font-bold ${active ? '' : 'text-secondary'}`}
              style={active ? { color: ON_PRIMARY } : undefined}
            >
              {lng.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
