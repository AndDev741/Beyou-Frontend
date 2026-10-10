import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useStore } from 'react-redux';
import { X } from 'lucide-react-native';
import { finishReview, getDueCards, reviewCard } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { CardRating, FinishReview } from '@beyou/types/notebook/notebook';
import Button from '../src/ui/Button';
import Chip from '../src/ui/Chip';
import ProgressBar from '../src/notebook/ProgressBar';
import { afterAnswer, position, startSession, type ReviewSession } from '@beyou/state/notebook/reviewQueue';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../src/store';

const RATINGS: CardRating[] = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
const RATING_LABEL_KEY: Record<CardRating, string> = {
  AGAIN: 'NotebookMobileRateAgain',
  HARD: 'NotebookMobileRateHard',
  GOOD: 'NotebookMobileRateGood',
  EASY: 'NotebookMobileRateEasy',
};

/**
 * Flashcard review, full screen.
 *
 * Outside the `(app)` group like the focus screen, so the bottom bar and the running-timer hub
 * stay out of a session that wants the whole screen. One card at a time: the front, "Show answer",
 * then four buttons, each labelled with when the card would come back.
 *
 * XP is paid by the server when the session ends (`finishReview`), once per review and capped per
 * day. Leaving early still ends it, so answers given before closing are not left unpaid.
 */
export default function NotebookReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { theme } = useBeyouTheme();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [summary, setSummary] = useState<FinishReview | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    void getDueCards(scope ?? null, t).then((response) => {
      if (!alive) return;
      if (response.success) {
        setSession(startSession(response.success.cards));
        setStreak(response.success.streak);
      } else {
        notify.error(getFriendlyErrorMessage(t, response.error));
        setSession(startSession([]));
      }
    });
    return () => {
      alive = false;
    };
  }, [scope, t]);

  const finish = useCallback(async () => {
    if (finished.current) return null;
    finished.current = true;
    const response = await finishReview(t);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return null;
    }
    if (response.success.refreshUi) {
      const prev = store.getState().perfil;
      applyRefreshUi(response.success.refreshUi, dispatch, { level: prev.level, constance: prev.constance });
    }
    return response.success;
  }, [dispatch, store, t]);

  const close = () => {
    // Answers already given are paid even when the session is cut short.
    if (session && session.reviewed > 0) void finish();
    if (router.canGoBack()) router.back();
    else router.replace('/notebook');
  };

  const rate = async (rating: CardRating) => {
    const card = session?.queue[0];
    if (!session || !card || answering) return;
    setAnswering(true);
    const response = await reviewCard(card.id, rating, t);
    setAnswering(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    const next = afterAnswer(session, response.success);
    setSession(next);
    setRevealed(false);
    if (next.queue.length === 0) {
      const result = await finish();
      if (result) setSummary(result);
    }
  };

  const card = session?.queue[0];

  return (
    <SafeAreaView className="flex-1 bg-bg" testID="notebook-review">
      <View className="flex-row items-center gap-2 px-2">
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookMobileCloseReview')}
          className="h-11 w-11 items-center justify-center"
          testID="notebook-review-close"
        >
          <X size={22} color={theme.text} />
        </Pressable>
        <Text className="flex-1 text-[16px] font-semibold text-text">{t('NotebookMobileReview')}</Text>
        {session && session.total > 0 && !summary ? (
          <Text className="pr-3 font-mono text-[13px] text-text-2" testID="notebook-review-position">
            {`${position(session)} / ${session.total}`}
          </Text>
        ) : null}
      </View>
      {session && session.total > 0 && !summary ? (
        <View className="mx-4 mt-2">
          <ProgressBar share={session.answered / session.total} />
        </View>
      ) : null}

      {!session ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : summary ? (
        <View className="flex-1 items-center justify-center gap-3 px-8" testID="notebook-review-summary">
          <Text className="text-center text-[22px] font-semibold text-text">{t('NotebookMobileSessionDone')}</Text>
          <Text className="text-center text-[15px] text-text-2">
            {t('NotebookMobileSessionReviewed', { count: session.reviewed })}
          </Text>
          <View className="flex-row gap-2">
            {summary.xpEarned > 0 ? (
              <Chip variant="xp">{t('NotebookMobileXpEarned', { xp: Math.round(summary.xpEarned) })}</Chip>
            ) : null}
            {summary.streak > 0 ? (
              <Chip variant="flame">{t('NotebookMobileReviewStreak', { count: summary.streak })}</Chip>
            ) : null}
          </View>
          <Button text={t('NotebookMobileDone')} size="auto" onPress={close} testID="notebook-review-finish" />
        </View>
      ) : !card ? (
        <View className="flex-1 items-center justify-center gap-3 px-8" testID="notebook-review-empty">
          <Text className="text-center text-[18px] font-semibold text-text">{t('NotebookMobileNothingDueTitle')}</Text>
          <Text className="text-center text-[14px] text-text-2">{t('NotebookMobileNothingDueBody')}</Text>
          <Button text={t('NotebookMobileBack')} mode="tonal" size="auto" onPress={close} />
        </View>
      ) : (
        <View className="flex-1 gap-4 px-4 pb-6 pt-5">
          <ScrollView
            className="flex-1 rounded-frame border border-border bg-surface"
            contentContainerStyle={{ padding: 22, gap: 16 }}
            testID="notebook-review-card"
          >
            <View className="flex-row flex-wrap gap-1.5">
              {card.pageTitle ? <Chip variant="accent">{card.pageTitle}</Chip> : null}
              {card.topicTitle && card.topicTitle !== card.pageTitle ? <Chip>{card.topicTitle}</Chip> : null}
            </View>
            <Text className="text-[21px] font-semibold leading-[29px] text-text" testID="notebook-review-front">
              {card.front}
            </Text>
            {revealed ? (
              <>
                <View className="h-px bg-border" />
                <Text className="text-[17px] leading-[26px] text-text" testID="notebook-review-back">
                  {card.back}
                </Text>
                {card.sourceLabel ? (
                  <Text className="text-[12px] text-text-2">{t('NotebookMobileFrom', { source: card.sourceLabel })}</Text>
                ) : null}
              </>
            ) : (
              <Text className="text-[13px] text-text-2">{t('NotebookMobileSayItFirst')}</Text>
            )}
          </ScrollView>

          {revealed ? (
            <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel={t('NotebookMobileHowWell')}>
              {RATINGS.map((rating) => {
                const days = card.intervals[rating] ?? 0;
                const good = rating === 'GOOD';
                return (
                  <Pressable
                    key={rating}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(RATING_LABEL_KEY[rating])}, ${intervalLabel(t, days)}`}
                    disabled={answering}
                    onPress={() => void rate(rating)}
                    testID={`notebook-review-rate-${rating}`}
                    className={`h-[60px] flex-1 items-center justify-center rounded-card ${
                      good ? 'bg-accent' : 'border border-border bg-surface'
                    } ${answering ? 'opacity-60' : ''}`}
                  >
                    <Text className={`text-[14px] font-semibold ${good ? 'text-on-accent' : 'text-text'}`}>
                      {t(RATING_LABEL_KEY[rating])}
                    </Text>
                    <Text className={`font-mono text-[11px] ${good ? 'text-on-accent' : 'text-text-2'}`}>
                      {intervalLabel(t, days)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Button
              text={t('NotebookMobileShowAnswer')}
              size="block"
              onPress={() => setRevealed(true)}
              testID="notebook-review-show"
            />
          )}
          <View className="flex-row items-center justify-center gap-2">
            {streak > 0 ? <Chip variant="flame">{t('NotebookMobileReviewStreak', { count: streak })}</Chip> : null}
            <Text className="text-[12px] text-text-2">{t('NotebookMobileXpAtEnd', { count: session.total })}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function intervalLabel(t: (key: string, options?: Record<string, unknown>) => string, days: number): string {
  return days <= 0 ? t('NotebookMobileIntervalToday') : t('NotebookMobileIntervalDays', { count: days });
}
