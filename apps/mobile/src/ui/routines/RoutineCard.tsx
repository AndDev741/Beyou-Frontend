import { useState } from 'react';
import type { RefObject } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { CalendarDays, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react-native';
import { calculateLevelProgress, getRoutineStats } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import BeyouIcon from '../BeyouIcon';
import IconButton from '../IconButton';
import { formatTimeRange } from './routineMetrics';
import RoutineItem, { type MergedItem } from '../dashboard/RoutineItem';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

function mergeItems(section: RoutineSection): MergedItem[] {
  const habits: MergedItem[] = (section.habitGroup ?? []).map((g) => ({
    type: 'habit',
    id: g.habitId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.habitGroupChecks,
  }));
  const tasks: MergedItem[] = (section.taskGroup ?? []).map((g) => ({
    type: 'task',
    id: g.taskId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.taskGroupChecks,
  }));
  return [...habits, ...tasks].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

interface RoutineCardProps {
  routine: Routine;
  today: string;
  onSchedule: (r: Routine) => void;
  onEdit: (r: Routine) => void;
  onDelete: (r: Routine) => void;
  onChanged: () => void;
  scheduleRef?: React.RefObject<View | null>;
}

/** Domingo→sábado, com a inicial em pt/en resolvida pelo i18n do chamador. */
const WEEK_DAYS = [
  { key: 'sunday', short: 'D' },
  { key: 'monday', short: 'S' },
  { key: 'tuesday', short: 'T' },
  { key: 'wednesday', short: 'Q' },
  { key: 'thursday', short: 'Q' },
  { key: 'friday', short: 'S' },
  { key: 'saturday', short: 'S' },
] as const;

/**
 * Cartão de rotina no desenho de telefone da web: cabeçalho enxuto (ícone,
 * nome, contagem, chevron), a fileira de dias e UMA barra — o progresso do dia
 * quando a rotina roda nele, senão o nível. Duas barras iguais empilhadas em
 * tela estreita não diziam qual importava agora.
 *
 * Agendar/editar/excluir aparecem ao abrir o cartão, como na web abaixo de
 * `md`: fechado ele fica limpo.
 */
export default function RoutineCard({ routine, today, onSchedule, onEdit, onDelete, onChanged, scheduleRef }: RoutineCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const [expanded, setExpanded] = useState(false);

  const stats = getRoutineStats(routine, today);
  const sections = routine.routineSections?.length ?? 0;
  const totalItems = stats.totalItems;
  const completion = totalItems > 0 ? Math.round((stats.completedItems / totalItems) * 100) : 0;
  const levelPct = calculateLevelProgress(routine.xp ?? 0, routine.actualLevelXp ?? 0, routine.nextLevelXp ?? 0);

  const scheduledDays = new Set((routine.schedule?.days ?? []).map((day) => day.toLowerCase()));
  // A rotina roda no dia aberto? Sem agenda, assume que sim (rotina avulsa).
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const runsToday = scheduledDays.size === 0 || scheduledDays.has(weekday);

  return (
    <View className="rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={() => setExpanded((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={routine.name}
          accessibilityState={{ expanded }}
          testID={`routine-card-${routine.id}`}
          className="min-w-0 flex-1"
        >
          <Text className="text-base font-semibold tracking-[-0.01em] text-text" numberOfLines={1}>
            {routine.name}
          </Text>
          <Text className="text-xs text-text-3" numberOfLines={1}>
            {[
              t('SectionsCount', { count: sections }),
              t('ItemsCount', { count: totalItems }),
              scheduledDays.size > 0
                ? scheduledDays.size === 7
                  ? t('EveryDay')
                  : t('DaysPerWeek', { count: scheduledDays.size })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Pressable>

        <IconButton
          label={expanded ? t('Collapse') : t('Expand')}
          onPress={() => setExpanded((open) => !open)}
          testID={`routine-expand-${routine.id}`}
        >
          {/* Ícone trocado em vez de rotacionado (ver ConfigSection). */}
          {expanded ? (
            <ChevronUp size={18} color={theme.text3} />
          ) : (
            <ChevronDown size={18} color={theme.text3} />
          )}
        </IconButton>
      </View>

      {/* Quando ela roda: sete quadradinhos, os agendados no acento. */}
      <View className="mt-3 flex-row gap-1">
        {WEEK_DAYS.map((day, index) => {
          const on = scheduledDays.has(day.key);
          return (
            <View
              key={`${day.key}-${index}`}
              className={`h-[26px] w-[26px] items-center justify-center rounded-[8px] ${
                on ? 'bg-accent-soft' : 'bg-surface-2'
              }`}
            >
              <Text
                className={`font-mono-semibold text-[11px] ${on ? 'text-accent' : 'text-text-3'}`}
              >
                {day.short}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Uma barra só: hoje quando a rotina roda hoje, senão o nível. */}
      <View className="mt-3">
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <View
            className="h-full rounded-full bg-accent"
            style={{ width: `${runsToday ? completion : levelPct}%` }}
          />
        </View>
        <Text className="mt-1.5 text-right font-mono text-[11px] text-text-3">
          {runsToday
            ? `${t('Today').toLowerCase()} ${stats.completedItems}/${totalItems}`
            : `LV ${routine.level ?? 0} · ${routine.xp ?? 0}/${routine.nextLevelXp ?? 0}`}
        </Text>
      </View>

      {expanded ? (
        <View className="mt-3 border-t border-border pt-3">
          {/* Fechado o cartão fica limpo; as ações vêm com o resto ao abrir. */}
          <View className="mb-3 flex-row items-center gap-1.5">
            <Pressable
              ref={scheduleRef}
              onPress={() => onSchedule(routine)}
              accessibilityRole="button"
              accessibilityLabel={t('Schedule')}
              testID={scheduleRef ? 'schedule-routine' : `schedule-${routine.id}`}
              className="flex-row items-center gap-1.5 rounded-control bg-accent-soft px-3.5 py-[7px] active:opacity-80"
            >
              <CalendarDays size={14} color={theme.accent} />
              <Text className="text-[12.5px] font-semibold text-accent">{t('Schedule')}</Text>
            </Pressable>

            <IconButton label={t('Edit')} onPress={() => onEdit(routine)} testID={`edit-${routine.id}`}>
              <Pencil size={15} color={theme.text3} />
            </IconButton>
            <IconButton
              label={t('Delete')}
              tone="danger"
              onPress={() => onDelete(routine)}
              testID={`delete-${routine.id}`}
            >
              <Trash2 size={15} color={theme.text3} />
            </IconButton>
          </View>

          {routine.routineSections?.map((section, index) => (
            <View key={section.id ?? index} className="mb-3">
              <View className="flex-row items-center gap-2">
                <BeyouIcon id={section.iconId} size={16} />
                <Text className="shrink text-[12.5px] font-semibold text-text-2" numberOfLines={1}>
                  {section.name}
                </Text>
                <Text className="shrink-0 font-mono text-[11px] text-text-3">
                  {formatTimeRange(section.startTime, section.endTime)}
                </Text>
              </View>
              {mergeItems(section).map((item) => {
                const resolved =
                  item.type === 'habit'
                    ? habits?.find((h) => h.id === item.id)
                    : tasks?.find((tk) => tk.id === item.id);
                if (!resolved) return null;
                return (
                  <RoutineItem
                    key={`${item.type}-${item.groupId}`}
                    routineId={routine.id ?? ''}
                    item={item}
                    name={resolved.name}
                    iconId={resolved.iconId}
                    motivationalPhrase={
                      item.type === 'habit'
                        ? (resolved as { motivationalPhrase?: string }).motivationalPhrase
                        : undefined
                    }
                    today={today}
                    onChanged={onChanged}
                  />
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
