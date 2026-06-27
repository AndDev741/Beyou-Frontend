import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { Snapshot } from '@beyou/types/routine/snapshot';
import BeyouIcon from '../BeyouIcon';
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
      <View className="flex-row justify-between rounded-xl bg-primary/10 p-3">
        <Text className="text-secondary text-sm">{t('Completed')}: {completed}</Text>
        <Text className="text-secondary text-sm">{t('Skipped')}: {skipped}</Text>
        <Text className="text-primary text-sm font-semibold">{xp} {t('XpEarned')}</Text>
      </View>

      {[...snapshot.structure.sections]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section, i) => (
        <View key={`${section.name}-${i}`} className="rounded-2xl border border-primary/20 bg-background p-4">
          <View className="flex-row items-center gap-1.5">
            <BeyouIcon id={section.iconId} size={18} />
            <Text className="text-primary shrink text-lg font-bold">{section.name}</Text>
            <Text className="text-description shrink-0 text-sm">{range(section.startTime, section.endTime)}</Text>
          </View>
          {[...section.items].sort(byStart).map((item) => {
            const check = snapshot.checks.find((c) => c.originalGroupId === item.groupId);
            const itemRange = range(item.startTime, item.endTime);
            return (
              <View key={item.groupId} className="mt-2 flex-row items-center gap-2">
                <BeyouIcon id={item.iconId} size={16} />
                <Text className={`flex-1 text-sm ${check?.checked ? 'text-description line-through' : 'text-secondary'}`}>{item.name}</Text>
                {itemRange ? <Text className="text-description text-xs">{itemRange}</Text> : null}
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
            );
          })}
        </View>
      ))}
    </View>
  );
}
