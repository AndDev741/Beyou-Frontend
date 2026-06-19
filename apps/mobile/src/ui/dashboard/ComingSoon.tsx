import { type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface ComingSoonProps {
  /** i18n key for the screen title (e.g. "Categories"). */
  titleKey: string;
  children?: ReactNode;
}

/**
 * Themed placeholder for a section screen not yet built (Phase 3 ships the
 * dashboard; the section screens are future phases). Shows the title, a "coming
 * soon" line, a back affordance, and optional extra content (e.g. the logout
 * button on the configuration stub).
 */
export default function ComingSoon({ titleKey, children }: ComingSoonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();

  return (
    <View className="flex-1 bg-background px-6 pt-14" testID={`screen-${titleKey}`}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        testID="back-button"
        className="mb-6 flex-row items-center"
      >
        <Ionicons name="chevron-back" size={26} color={theme.primary} />
        <Text className="text-primary text-lg font-semibold">{t(titleKey)}</Text>
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <Text className="text-secondary text-2xl font-bold">{t(titleKey)}</Text>
        <Text className="text-description mt-2 text-base">{t('ComingSoon')}</Text>
        {children}
      </View>
    </View>
  );
}
