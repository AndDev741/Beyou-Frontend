import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { Snapshot } from '@beyou/types/routine/snapshot';
import BeyouIcon from '../BeyouIcon';
import Card from '../Card';
import { useBeyouTheme } from '../../theme/ThemeProvider';

const fmt = (s?: string | null) => (s ? s.slice(0, 5) : '');
const range = (start?: string | null, end?: string | null) => [fmt(start), fmt(end)].filter(Boolean).join(' - ');
// Empty/null times sort last.
const byStart = <T extends { startTime: string | null; name: string }>(a: T, b: T) =>
  (a.startTime || '~~~~~').localeCompare(b.startTime || '~~~~~') || a.name.localeCompare(b.name);

interface SnapshotCardProps {
  snapshot: Snapshot;
  onCheck: (checkId: string) => void;
  onSkip: (checkId: string) => void;
}

export default function SnapshotCard({ snapshot, onCheck, onSkip }: SnapshotCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const completed = snapshot.checks.filter((c) => c.checked).length;
  const skipped = snapshot.checks.filter((c) => c.skipped).length;
  const xp = snapshot.checks.reduce((sum, c) => sum + (c.checked ? c.xpGenerated : 0), 0);

  return (
    <View className="gap-4" testID="snapshot-card">
      <View className="flex-row justify-between rounded-card bg-accent/10 p-3">
        <Text className="text-text text-sm">{t('Completed')}: {completed}</Text>
        <Text className="text-text text-sm">{t('Skipped')}: {skipped}</Text>
        <Text className="text-accent text-sm font-semibold">{xp} {t('XpEarned')}</Text>
      </View>

      {[...snapshot.structure.sections]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section, i) => (
        <Card key={`${section.name}-${i}`}>
          <View className="flex-row items-center gap-1.5">
            <BeyouIcon id={section.iconId} size={18} />
            <Text className="text-accent shrink text-lg font-bold">{section.name}</Text>
            <Text className="text-text-2 shrink-0 text-sm">{range(section.startTime, section.endTime)}</Text>
          </View>
          {[...section.items].sort(byStart).map((item) => {
            const check = snapshot.checks.find((c) => c.originalGroupId === item.groupId);
            const itemRange = range(item.startTime, item.endTime);
            const microTasks = check?.microTasks ?? [];
            const pomodoros = check?.pomodoros ?? 0;
            return (
              <View key={item.groupId} className="mt-2">
              <View className="flex-row items-center gap-2">
                <BeyouIcon id={item.iconId} size={16} />
                <Text className={`flex-1 text-sm ${check?.checked ? 'text-text-2 line-through' : 'text-text'}`}>{item.name}</Text>
                {itemRange ? <Text className="text-text-2 text-xs">{itemRange}</Text> : null}
                {check ? (
                  <View className="flex-row gap-2">
                    <Pressable onPress={() => onCheck(check.id)} accessibilityRole="button" testID={`snap-check-${check.id}`}>
                      <Ionicons name={check.checked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={check.checked ? theme.primary : theme.description} />
                    </Pressable>
                    <Pressable onPress={() => onSkip(check.id)} accessibilityRole="button" testID={`snap-skip-${check.id}`}>
                      <Ionicons name={check.skipped ? 'play-skip-forward-circle' : 'play-skip-forward-outline'} size={24} color={check.skipped ? theme.icon : theme.description} />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* What the Focus Mode did on this item that day. History is read, so nothing here
                  is interactive. */}
              {microTasks.length > 0 || pomodoros > 0 ? (
                <View className="ml-6 mt-1 flex-row flex-wrap items-center gap-1.5" testID={`snapshot-focus-${item.groupId}`}>
                  {pomodoros > 0 ? (
                    <Text
                      className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-medium text-accent"
                      testID={`snapshot-pomodoros-${item.groupId}`}
                    >
                      {t('FocusPomodorosOnItem', { count: pomodoros })}
                    </Text>
                  ) : null}
                  {microTasks.map((task) => (
                    <Text
                      key={task.id}
                      className={`rounded-full border border-border px-2 py-0.5 text-[11px] ${
                        task.doneAt ? 'text-text-3 line-through' : 'text-text-2'
                      }`}
                      testID={`snapshot-micro-task-${task.id}`}
                    >
                      {task.name}
                    </Text>
                  ))}
                </View>
              ) : null}
              </View>
            );
          })}
        </Card>
      ))}
    </View>
  );
}
