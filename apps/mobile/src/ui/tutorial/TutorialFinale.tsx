import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { completeTutorial } from '../../tutorial/completeTutorial';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../store';

const ON_PRIMARY = '#FFFFFF';

/**
 * Closing message shown on the dashboard when the tutorial reaches the 'done'
 * phase. If a routine is scheduled for today it points the user at it; otherwise
 * it sends them off to explore. Dismissing completes the tutorial. Rendered as an
 * in-tree View (not a Modal) so it can't stack behind a duplicate dashboard.
 */
export default function TutorialFinale() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const hasTodayRoutine = useSelector((s: RootState) => !!s.todayRoutine.routine);

  const finish = () => { completeTutorial({ dispatch, t }); };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} className="items-center justify-center p-6">
      <View className="w-full max-w-sm items-center rounded-3xl border border-primary/20 bg-background p-6">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name={hasTodayRoutine ? 'sparkles' : 'rocket-outline'} size={28} color={theme.primary} />
        </View>
        <Text className="text-secondary text-center text-2xl font-bold">{t('TutorialFinaleTitle')}</Text>
        <Text className="text-description mt-2 text-center text-base leading-relaxed">
          {hasTodayRoutine ? t('TutorialFinaleScheduled') : t('TutorialFinaleExplore')}
        </Text>
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          testID="tutorial-finale-done"
          className="mt-5 items-center rounded-md bg-primary px-6 py-3"
        >
          <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">{t('TutorialGetStarted')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
