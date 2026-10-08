import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { moodLabelKey } from '@beyou/state';
import type { MoodEntry } from '@beyou/types/mood/mood';
import { MOOD_FACES } from '../mood/moodScale';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface Props {
  /** Yesterday's entry from the shared mood slice, or undefined when none was logged. */
  entry: MoodEntry | undefined;
}

/** Past this many characters the journal is clamped behind "Read all". */
const CLAMP_AT = 220;

/**
 * The native twin of the web's `YesterdayMood`: yesterday's face and what the user wrote.
 *
 * Read by the client from the mood API, never from the briefing payload, so the model that
 * writes the summary cannot see the journal. The small print under the text says so.
 */
export default function BriefingYesterdayMood({ entry }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);

  if (!entry) return null;

  const { Icon, color } = MOOD_FACES[entry.mood];
  const note = entry.note?.trim() ?? '';
  const long = note.length > CLAMP_AT;

  return (
    <View
      className="mt-4 rounded-control border border-border bg-surface p-3"
      testID="briefing-mood-yesterday"
    >
      <View className="flex-row items-center gap-2">
        <Icon size={18} color={color(theme)} />
        <Text className="text-sm font-medium text-text">
          {t('BriefingYesterdayMood', { mood: t(moodLabelKey(entry.mood)) })}
        </Text>
      </View>

      {note ? (
        <>
          <Text
            className="mt-2 text-sm leading-relaxed text-text-2"
            numberOfLines={long && !expanded ? 4 : undefined}
            testID="briefing-journal"
          >
            {note}
          </Text>
          {long ? (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              className="mt-1 self-start py-1"
            >
              <Text className="text-xs font-medium text-accent">
                {expanded ? t('BriefingJournalShowLess') : t('BriefingJournalReadAll')}
              </Text>
            </Pressable>
          ) : null}
          <View className="mt-2 flex-row items-center gap-1.5">
            <Lock size={11} color={theme.text3} />
            <Text className="flex-1 text-[11px] text-text-3">{t('BriefingJournalPrivate')}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
