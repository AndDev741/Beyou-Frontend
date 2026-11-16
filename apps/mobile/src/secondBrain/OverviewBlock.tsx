import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react-native';
import { getFriendlyErrorMessage, type ApiErrorPayload } from '@beyou/api/apiError';
import { SECOND_BRAIN_VERDICT, type SecondBrainVerdictTone } from '@beyou/state';
import type { SecondBrainInsight } from '@beyou/types/secondBrain/secondBrain';
import Button from '../ui/Button';
import Chip, { type ChipVariant } from '../ui/Chip';
import AiPrivacyNotice from '../ui/agent/AiPrivacyNotice';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block, { Shimmer } from './Block';

type OverviewBlockProps = {
  insight: SecondBrainInsight;
  aiAvailable: boolean;
  writing: boolean;
  error: ApiErrorPayload | null;
  onWrite: () => void;
};

/** The shared rule names a tone; this is the phone's chip for each. */
const VERDICT_CHIP: Record<SecondBrainVerdictTone, ChipVariant> = {
  ok: 'ok',
  flame: 'flame',
  neutral: 'neutral',
};

/**
 * The lead of the screen: a few sentences the model wrote about how things are going.
 *
 * It is prose and reads as prose, set larger than anything else here. The numbers it draws
 * on sit in the blocks below, which is why this one carries none.
 */
export default function OverviewBlock({ insight, aiAvailable, writing, error, onWrite }: OverviewBlockProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  // A verdict this build does not know is left out instead of drawn as a blank label.
  const verdict = insight.text && insight.verdict ? SECOND_BRAIN_VERDICT[insight.verdict] : undefined;

  const writtenAt = insight.generatedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(insight.generatedAt),
      )
    : null;

  return (
    <Block
      title={t('SecondBrainOverviewTitle')}
      testID="second-brain-overview"
      action={
        // The verdict is the answer the screen exists for, so it sits where the eye lands
        // first. Hidden while a new one is being written: the old label would be read as today's.
        verdict && !writing ? (
          <Chip variant={VERDICT_CHIP[verdict.tone]} className="h-7 px-3" testID="second-brain-verdict">
            {t(verdict.label)}
          </Chip>
        ) : undefined
      }
    >
      {writing ? (
        <View testID="second-brain-overview-writing">
          <Shimmer label={t('SecondBrainOverviewWriting')} lines={['100%', '94%', '88%', '60%']} />
          <Text className="mt-4 text-[12.5px] text-text-3">{t('SecondBrainOverviewWriting')}</Text>
        </View>
      ) : insight.text ? (
        <>
          <Text className="text-base leading-[26px] text-text">{insight.text}</Text>
          <View className="mt-4 gap-0.5">
            {writtenAt ? (
              <Text className="text-[12.5px] text-text-3">{t('SecondBrainOverviewUpdated', { when: writtenAt })}</Text>
            ) : null}
            {insight.stale ? (
              <Text className="text-[12.5px] text-text-2">{t('SecondBrainOverviewStale')}</Text>
            ) : null}
          </View>
          {aiAvailable ? (
            <Button
              text={t('SecondBrainOverviewRefresh')}
              mode="ghost"
              size="auto"
              icon={<RefreshCw size={15} color={theme.text2} />}
              onPress={onWrite}
              className="mt-1 self-end"
              testID="second-brain-overview-refresh"
            />
          ) : null}
        </>
      ) : aiAvailable ? (
        <View className="gap-4">
          <Text className="text-sm leading-[21px] text-text-2">{t('SecondBrainOverviewEmpty')}</Text>
          <Button
            text={t('SecondBrainOverviewWrite')}
            mode="primary"
            size="auto"
            onPress={onWrite}
            className="self-start"
            testID="second-brain-overview-write"
          />
          {/* The first overview is asked for, never written unprompted: this button is
              where the person agrees to their data going to the provider, so the notice
              sits under it. It is not repeated once an overview exists. */}
          <AiPrivacyNotice messageKey="SecondBrainPrivacyNotice" testID="second-brain-privacy-notice" />
        </View>
      ) : (
        <Text className="text-sm leading-[21px] text-text-2">{t('SecondBrainAiOff')}</Text>
      )}

      {error && !writing ? (
        <Text accessibilityRole="alert" className="mt-4 text-sm text-danger" testID="second-brain-overview-error">
          {getFriendlyErrorMessage(t, error)}
        </Text>
      ) : null}
    </Block>
  );
}
