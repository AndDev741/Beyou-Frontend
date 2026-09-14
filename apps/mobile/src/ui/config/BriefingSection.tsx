import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * Ask for today's Daily Briefing back. The native twin of the web's `BriefingConfiguration`.
 *
 * It exists for one mistake: the sheet is dismissed with a tap, and a tap on the backdrop is
 * easy to make before you have read it. Everything else about the feature is built to stop it
 * appearing unasked, so there was no way back in.
 *
 * Reopening does NOT clear the server's `seenAt`. That column records that the day was
 * acknowledged, which stays true; this is a request to look again, answered by sending the
 * user to the dashboard with the sheet forced open. Clearing the column would reopen it on
 * their other devices too, which nobody asked for.
 */
export default function BriefingSection() {
  const { theme } = useBeyouTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="gap-2">
      <Text className="text-sm text-text-2">{t('BriefingConfigDescription')}</Text>
      <Pressable
        onPress={() => router.replace('/?briefing=1')}
        accessibilityRole="button"
        testID="briefing-show-again"
        className="mt-2 items-center rounded-control bg-accent px-6 py-3"
      >
        <Text style={{ color: theme.onAccent }} className="text-base font-semibold">
          {t('BriefingConfigShowAgain')}
        </Text>
      </Pressable>
    </View>
  );
}
