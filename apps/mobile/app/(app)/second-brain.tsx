import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ChevronLeft } from 'lucide-react-native';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { secondBrainSourceEnabled } from '@beyou/state';
import type { SecondBrainSource } from '@beyou/types/secondBrain/secondBrain';
import Button from '../../src/ui/Button';
import Card from '../../src/ui/Card';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import AreasBlock from '../../src/secondBrain/AreasBlock';
import GoalsBlock from '../../src/secondBrain/GoalsBlock';
import OverviewBlock from '../../src/secondBrain/OverviewBlock';
import ProfileBlock from '../../src/secondBrain/ProfileBlock';
import QuestionsBlock from '../../src/secondBrain/QuestionsBlock';
import RoutineBlock from '../../src/secondBrain/RoutineBlock';
import Skeleton from '../../src/secondBrain/Skeleton';
import SourcesBlock from '../../src/secondBrain/SourcesBlock';
import { useSecondBrain } from '../../src/secondBrain/useSecondBrain';
import type { RootState } from '../../src/store';
import { useScreenTopPadding } from '../../src/ui/useScreenTopPadding';

/**
 * Second Brain: what Beyou understands about a person's life, what it still wants to ask,
 * and what it is allowed to read. Mirror of the web's `/second-brain`.
 *
 * One column, in the order the web page takes below its two-column width: the overview,
 * then the questions (the one block that needs the person), then the blocks to read, then
 * the profile and the sources.
 */
export default function SecondBrainScreen() {
  const topPadding = useScreenTopPadding();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const brain = useSecondBrain();
  const { overview } = brain;
  // The assistant opens for nobody while onboarding runs, so the hand-off waits for it too.
  const assistantReady = useSelector((state: RootState) => state.perfil.isTutorialCompleted);

  // Back on this screen from another one, or from the background: a check-in or a goal
  // changed elsewhere moves the blocks here, and the web and the assistant write too.
  useAutoRefresh(brain.refresh);

  const enabled = (source: SecondBrainSource) =>
    overview ? secondBrainSourceEnabled(overview.sources, source) : false;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: topPadding }} testID="second-brain-screen">
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('SecondBrainMobileBack')}
          testID="back-button"
          className="h-11 w-8 justify-center"
        >
          <ChevronLeft size={24} color={theme.text2} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
            {t('SecondBrain')}
          </Text>
          <Text className="text-[12.5px] leading-[17px] text-text-3">{t('SecondBrainSubtitle')}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
        // Or the first tap on Answer or Save only closes the keyboard.
        keyboardShouldPersistTaps="handled"
      >
        {brain.status === 'loading' && !overview ? <Skeleton label={t('SecondBrainLoading')} /> : null}

        {brain.status === 'error' && !overview ? (
          <Card className="items-start gap-3 px-[18px] py-4" testID="second-brain-error">
            <Text className="text-[15px] font-semibold text-text">{t('SecondBrainLoadFailed')}</Text>
            {brain.loadError ? (
              <Text className="text-sm text-danger">{getFriendlyErrorMessage(t, brain.loadError)}</Text>
            ) : null}
            <Button
              text={t('TryAgain')}
              mode="tonal"
              size="auto"
              onPress={() => void brain.reload()}
              testID="second-brain-retry"
            />
          </Card>
        ) : null}

        {overview ? (
          <>
            <OverviewBlock
              insight={overview.insight}
              aiAvailable={overview.aiAvailable}
              writing={brain.writing}
              error={brain.insightError}
              onWrite={() => void brain.writeInsight()}
            />
            <QuestionsBlock
              questions={overview.questions}
              refilling={brain.refilling}
              canHandOver={assistantReady}
              onAnswer={brain.answer}
              onSkip={brain.skip}
              onRefill={() => void brain.refill()}
            />
            <GoalsBlock goals={overview.goalsAhead} enabled={enabled('GOALS')} />
            <RoutineBlock routine={overview.routine} />
            <AreasBlock areas={overview.areas} enabled={enabled('ROUTINES')} />
            <ProfileBlock
              facts={overview.facts}
              onCreate={brain.createFact}
              onEdit={brain.editFact}
              onDelete={brain.deleteFact}
            />
            <SourcesBlock
              sources={overview.sources}
              pending={brain.pendingSource}
              onToggle={(source, value) => void brain.toggleSource(source, value)}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
