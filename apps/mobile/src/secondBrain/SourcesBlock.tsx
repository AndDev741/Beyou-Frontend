import { Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CalendarDays, Lock, NotebookPen, Smile, StickyNote, Trophy } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SECOND_BRAIN_SOURCE_TEXT } from '@beyou/state';
import type { SecondBrainSource, SecondBrainSourceState } from '@beyou/types/secondBrain/secondBrain';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';

type SourcesBlockProps = {
  sources: SecondBrainSourceState[];
  /** The source whose switch is waiting on the server. */
  pending: SecondBrainSource | null;
  onToggle: (source: SecondBrainSource, enabled: boolean) => void;
};

/** The icon per source. The names and descriptions are shared with the web app. */
const SOURCE_ICON: Record<SecondBrainSource, LucideIcon> = {
  ROUTINES: CalendarDays,
  GOALS: Trophy,
  MOOD: Smile,
  CALENDAR: CalendarClock,
  NOTEBOOK: NotebookPen,
  IDEAS: StickyNote,
};

/** The switches for what Second Brain may read. Off means off everywhere on this screen. */
export default function SourcesBlock({ sources, pending, onToggle }: SourcesBlockProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  return (
    <Block title={t('SecondBrainSourcesTitle')} testID="second-brain-sources">
      <View className="gap-4">
        {sources.map(({ source, enabled }) => {
          const meta = SECOND_BRAIN_SOURCE_TEXT[source];
          const Icon = SOURCE_ICON[source];
          // A source this build does not know yet is skipped instead of drawn blank.
          if (!meta || !Icon) return null;
          // A native switch moves under the finger, so the one being saved shows where it
          // is going. If the save fails it comes back with the server's value.
          const shown = pending === source ? !enabled : enabled;
          return (
            <View key={source} className="flex-row items-start gap-3">
              <View className="pt-0.5">
                <Icon size={18} color={shown ? theme.accent : theme.text3} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-text">{t(meta.name)}</Text>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-text-2">{t(meta.detail)}</Text>
              </View>
              <Switch
                value={shown}
                onValueChange={(next) => onToggle(source, next)}
                // All six wait while one saves: the answer carries the whole list, and two
                // saves in flight would each paint over the other's switch.
                disabled={pending !== null}
                accessibilityLabel={t(meta.name)}
                accessibilityHint={t(meta.detail)}
                trackColor={{ true: theme.accent, false: theme.border }}
                testID={`second-brain-source-${source}`}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-5 flex-row items-start gap-2 border-t border-border pt-4">
        <View className="pt-0.5">
          <Lock size={14} color={theme.text3} />
        </View>
        <Text className="min-w-0 flex-1 text-[13px] leading-[18px] text-text-2">{t('SecondBrainSourcesJournal')}</Text>
      </View>
    </Block>
  );
}
