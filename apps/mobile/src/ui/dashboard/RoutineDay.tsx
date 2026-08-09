import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import type { RoutineSection } from '@beyou/types/routine/routineSection';
import { calculateDailyProgress } from '@beyou/state/dashboard/helpers';
import {
  checkedItemsInScheduledRoutineEnter,
  totalItemsInScheduledRoutineEnter,
} from '@beyou/state/user/perfilSlice';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { loadCollapsedSections, saveCollapsedSection } from '../../lib/collapsedSections';
import { formatTimeRange, getSectionStats } from '@beyou/state';
import Chip from '../Chip';
import EmptyState from '../EmptyState';
import BeyouIcon from '../BeyouIcon';
import IconButton from '../IconButton';
import RoutineItem, { type MergedItem } from './RoutineItem';
import RoutineCompleteSummary from './RoutineCompleteSummary';
import type { RootState, AppDispatch } from '../../store';

/** Flatten a section's habit + task groups into one start-time-sorted list. */
function mergeItems(section: RoutineSection): MergedItem[] {
  const tasks: MergedItem[] = (section.taskGroup ?? []).map((g) => ({
    type: 'task',
    id: g.taskId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.taskGroupChecks,
  }));
  const habits: MergedItem[] = (section.habitGroup ?? []).map((g) => ({
    type: 'habit',
    id: g.habitId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.habitGroupChecks,
  }));
  return [...tasks, ...habits].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

function EmptyRoutine() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  return (
    <EmptyState
      icon={<CalendarDays size={20} color={theme.accent} />}
      title={t('No Routines Scheduled for today')}
      description={t('NothingScheduledTodayDescription')}
      actionLabel={t('ScheduleRoutine')}
      onAction={() => router.push('/routines')}
      testID="routine-empty"
    />
  );
}

/**
 * Uma seção do dia. Fechada mostra o essencial — ícone, nome, horário e o XP
 * que ela rendeu; é o suficiente para decidir se vale abrir. Espelha o
 * `routineSection` da web.
 */
function Section({
  section,
  routineId,
  today,
  collapsedIds,
  onToggle,
}: {
  section: RoutineSection;
  routineId: string;
  today: string;
  collapsedIds: string[];
  onToggle: (sectionId: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const allHabits = useSelector((s: RootState) => s.habits.habits);
  const allTasks = useSelector((s: RootState) => s.tasks.tasks);

  const sectionId = section.id ?? section.name ?? '';
  const collapsed = collapsedIds.includes(sectionId);
  const items = mergeItems(section);
  const { xpEarned } = getSectionStats(section, today);
  const timeRange = formatTimeRange(section.startTime, section.endTime);

  return (
    <View className="mb-4 w-full" testID={`routine-section-${sectionId}`}>
      <View className="flex-row items-center gap-2">
        <BeyouIcon id={section.iconId} size={16} />
        <Text className="shrink text-[12.5px] font-semibold text-text-2" numberOfLines={1}>
          {section.name}
        </Text>
        {timeRange ? (
          <Text className="shrink-0 font-mono text-[11px] text-text-3">{timeRange}</Text>
        ) : null}
        {xpEarned > 0 ? (
          <Chip size="sm" variant="xp" testID={`routine-section-xp-${sectionId}`}>
            {`+${xpEarned} XP`}
          </Chip>
        ) : null}

        <IconButton
          label={collapsed ? t('Expand') : t('Collapse')}
          onPress={() => onToggle(sectionId)}
          className="ml-auto"
          testID={`routine-section-toggle-${sectionId}`}
        >
          {/* Ícone trocado em vez de rotacionado: rotate no style de um ícone
              lucide some com o SVG (ver ConfigSection). */}
          {collapsed ? (
            <ChevronRight size={16} color={theme.text3} />
          ) : (
            <ChevronDown size={16} color={theme.text3} />
          )}
        </IconButton>
      </View>

      {!collapsed
        ? items.map((item) => {
            const resolved =
              item.type === 'habit'
                ? allHabits?.find((h) => h.id === item.id)
                : allTasks?.find((task) => task.id === item.id);
            if (!resolved) return null;
            return (
              <RoutineItem
                key={`${item.type}-${item.groupId}`}
                routineId={routineId}
                item={item}
                name={resolved.name}
                iconId={resolved.iconId}
                motivationalPhrase={
                  item.type === 'habit'
                    ? (resolved as { motivationalPhrase?: string }).motivationalPhrase
                    : undefined
                }
                today={today}
              />
            );
          })
        : null}
    </View>
  );
}

export default function RoutineDay() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const today = new Date().toJSON().slice(0, 10);
  const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
  const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);
  // Recolher a seção economiza espaço no dia; a escolha é salva POR DIA, então
  // amanhã ela abre como nova.
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadCollapsedSections(today).then((ids) => {
      if (active) setCollapsedIds(ids);
    });
    return () => {
      active = false;
    };
  }, [today]);

  const toggleSection = useCallback(
    (sectionId: string) => {
      setCollapsedIds((current) => {
        const next = current.includes(sectionId)
          ? current.filter((id) => id !== sectionId)
          : [...current, sectionId];
        void saveCollapsedSection(today, sectionId, next.includes(sectionId));
        return next;
      });
    },
    [today],
  );

  // Sync today's checked/total into the perfil slice (drives the complete
  // summary). Re-runs whenever the routine changes — incl. after a check, since
  // refreshItemGroup produces a new routine reference.
  useEffect(() => {
    const date = new Date().toJSON().slice(0, 10);
    const { checked, total } = calculateDailyProgress(routine, date);
    dispatch(checkedItemsInScheduledRoutineEnter(checked));
    dispatch(totalItemsInScheduledRoutineEnter(total));
  }, [routine, dispatch]);

  if (!routine) return <EmptyRoutine />;

  return (
    <View className="rounded-card border border-border bg-surface px-3 pb-3 pt-4" testID="routine-day">
      <View className="flex-row items-center gap-3 pb-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold tracking-[-0.01em] text-text" numberOfLines={1}>
            {routine.name}
          </Text>
          <Text className="text-xs text-text-3" numberOfLines={1}>
            {`${t('TodaysRoutine')} · ${t('SectionsCount', { count: routine.routineSections?.length ?? 0 })}`}
          </Text>
        </View>

        {/* O progresso do dia vive no cabeçalho: é o número que responde
            "quanto falta" sem percorrer a lista. */}
        {total > 0 ? (
          <View className="shrink-0 items-end">
            <Text className="font-mono text-[12.5px] font-medium text-text-2">
              {`${checked} ${t('Of')} ${total}`}
            </Text>
            <View className="mt-1.5 h-1.5 w-[92px] overflow-hidden rounded-full bg-surface-2">
              <View
                className="h-full rounded-full bg-accent"
                // O bloco só existe com `total > 0` (linha acima), então aqui
                // não há divisão por zero a defender.
                style={{ width: `${Math.round((checked / total) * 100)}%` }}
              />
            </View>
          </View>
        ) : null}
      </View>

      {routine.routineSections?.map((section, sIdx) => (
        <Section
          key={section.id ?? sIdx}
          section={section}
          routineId={routine.id ?? ''}
          today={today}
          collapsedIds={collapsedIds}
          onToggle={toggleSection}
        />
      ))}

      <RoutineCompleteSummary />
    </View>
  );
}
