import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { check as Check } from '@beyou/types/routine/routineSection';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useRoutineCheckin } from '../../dashboard/useRoutineCheckin';
import XpFloat from './XpFloat';

const XP_FLOAT_DURATION_MS = 1200;

export interface MergedItem {
  type: 'habit' | 'task';
  id: string;
  groupId: string;
  startTime?: string;
  endTime?: string;
  check?: Check[];
}

interface RoutineItemProps {
  routineId: string;
  item: MergedItem;
  name: string;
  motivationalPhrase?: string;
  /** YYYY-MM-DD for "today" — matched against check.checkDate. */
  today: string;
  /** Called after a successful check or skip so callers can refetch routine state. */
  onChanged?: () => void;
}

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

function groupDTO(item: MergedItem) {
  return item.type === 'task'
    ? { taskGroupDTO: { taskGroupId: item.groupId, startTime: item.startTime ?? '' } }
    : { habitGroupDTO: { habitGroupId: item.groupId, startTime: item.startTime ?? '' } };
}

export default function RoutineItem({ routineId, item, name, motivationalPhrase, today, onChanged }: RoutineItemProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { check, skip } = useRoutineCheckin();
  const [pending, setPending] = useState(false);
  const [xpFloat, setXpFloat] = useState<number | null>(null);
  const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (floatTimer.current) clearTimeout(floatTimer.current); }, []);

  const todayCheck = item.check?.find((c) => c?.checkDate === today);
  const checked = todayCheck?.checked === true;
  const skipped = todayCheck?.skipped === true && !checked;

  const onCheck = async () => {
    if (pending) return;
    setPending(true);
    const dto: itemGroupToCheck = { routineId, ...groupDTO(item) };
    const result = await check(dto, { wasChecked: checked, motivationalPhrase });
    const itemChecked = result?.refreshItemChecked;
    const gen = itemChecked?.check?.xpGenerated;
    if (itemChecked && gen && itemChecked.check.checked) {
      setXpFloat(gen);
      if (floatTimer.current) clearTimeout(floatTimer.current);
      floatTimer.current = setTimeout(() => setXpFloat(null), XP_FLOAT_DURATION_MS);
    }
    setPending(false);
    onChanged?.();
  };

  const onSkip = async () => {
    if (pending) return;
    setPending(true);
    const dto: itemGroupToSkip = { routineId, skip: !skipped, ...groupDTO(item) };
    await skip(dto);
    setPending(false);
    onChanged?.();
  };

  const timeRange = [fmt(item.startTime), fmt(item.endTime)].filter(Boolean).join(' - ');

  return (
    <View className={`mt-1 flex-row items-center justify-between gap-2 py-1 ${skipped ? 'opacity-60' : ''}`} testID={`routine-item-${item.groupId}`}>
      {/* Left: checkbox + name. Name shrinks/wraps so it never pushes the time
          or skip button off-screen. */}
      <Pressable
        onPress={onCheck}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={name}
        testID={`routine-check-${item.groupId}`}
        className="flex-1 flex-row items-center"
      >
        {xpFloat !== null && <XpFloat xp={xpFloat} />}
        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} />
        <Text className={`ml-2 shrink text-base ${skipped ? 'text-description line-through' : 'text-secondary'}`}>
          {name}
        </Text>
      </Pressable>

      {/* Right: time + skip stay together, fixed — no overlap with the name. */}
      <View className="shrink-0 flex-row items-center gap-2">
        {timeRange ? <Text className="text-primary text-xs">{timeRange}</Text> : null}
        {!checked && (
          <Pressable
            onPress={onSkip}
            disabled={pending}
            accessibilityRole="button"
            testID={`routine-skip-${item.groupId}`}
            className="flex-row items-center gap-1 rounded-md border border-description/40 px-2 py-1.5"
          >
            <Ionicons name="ban-outline" size={14} color={theme.description} />
            <Text className="text-description text-xs font-semibold">{skipped ? t('Undo skip') : t('Skip')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
