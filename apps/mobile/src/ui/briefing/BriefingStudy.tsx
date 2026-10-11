import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Repeat } from 'lucide-react-native';
import { briefingStudy, briefingStudyRecap, formatStudyMinutes } from '@beyou/state';
import type { BriefingStudyEntry, DailyBriefing } from '@beyou/types/briefing/briefing';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * Today's study cycles in the briefing, the phone's copy of the web section: per cycle, when it
 * starts, how long, and its first blocks in one sentence, with yesterday's study beside the
 * heading. Renders nothing for a server that predates the study cycle, or on a day with no study.
 *
 * The blocks are joined by hand rather than with `Intl.ListFormat`, which Hermes does not ship.
 */
export default function BriefingStudy({ briefing }: { briefing: DailyBriefing }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const study = briefingStudy(briefing);
  if (study.length === 0) return null;

  const recap = briefingStudyRecap(briefing);
  const total = study.reduce((sum, cycle) => sum + cycle.minutes, 0);
  const entryText = (entry: BriefingStudyEntry) =>
    entry.mode === 'GOAL'
      ? entry.title
      : t('BriefingStudyTimeEntry', { minutes: formatStudyMinutes(entry.minutesToday), title: entry.title });

  return (
    <View className="mt-4 rounded-xl border border-border bg-surface-2 p-3.5" style={{ gap: 10 }} testID="briefing-study">
      <View className="flex-row items-center gap-2">
        <Repeat size={14} color={theme.accent} />
        <Text className="flex-1 text-sm font-semibold text-text">
          {t('BriefingStudyHeading', { minutes: formatStudyMinutes(total) })}
        </Text>
      </View>
      {recap ? (
        <Text className="text-xs text-text-2" testID="briefing-study-yesterday">
          {recap.understood > 0
            ? t('BriefingStudyYesterday', { count: recap.understood, minutes: formatStudyMinutes(recap.minutes) })
            : t('BriefingStudyYesterdayMinutes', { minutes: formatStudyMinutes(recap.minutes) })}
        </Text>
      ) : null}
      {study.map((cycle) => (
        <View key={cycle.cycleName} className="flex-row gap-3" testID="briefing-study-cycle">
          <Text className="w-11 pt-0.5 text-xs font-semibold text-text-2">{cycle.startTime ?? ''}</Text>
          <Text className="flex-1 text-sm leading-5 text-text">
            {cycle.entries.length > 0
              ? t('BriefingStudyCycleLine', {
                  cycle: cycle.cycleName,
                  minutes: formatStudyMinutes(cycle.minutes),
                  entries: cycle.entries.map(entryText).join(', '),
                })
              : t('BriefingStudyCycleOnly', { cycle: cycle.cycleName, minutes: formatStudyMinutes(cycle.minutes) })}
          </Text>
        </View>
      ))}
    </View>
  );
}
