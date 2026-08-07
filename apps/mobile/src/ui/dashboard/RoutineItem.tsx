import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ban } from 'lucide-react-native';
import type { check as Check } from '@beyou/types/routine/routineSection';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useRoutineCheckin } from '../../dashboard/useRoutineCheckin';
import BeyouIcon from '../BeyouIcon';
import Chip from '../Chip';
import IconTile from '../IconTile';
import Ring from '../Ring';
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
  /** Ícone salvo do hábito/tarefa — acompanha a notificação de conclusão. */
  iconId?: string;
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

export default function RoutineItem({ routineId, item, name, iconId, motivationalPhrase, today, onChanged }: RoutineItemProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { check, skip } = useRoutineCheckin();
  const [pending, setPending] = useState(false);
  const [xpFloat, setXpFloat] = useState<number | null>(null);
  // Optimistic overrides so the tap feels instant instead of waiting a server round-trip.
  const [optChecked, setOptChecked] = useState<boolean | null>(null);
  const [optSkipped, setOptSkipped] = useState<boolean | null>(null);
  const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (floatTimer.current) clearTimeout(floatTimer.current); }, []);

  const todayCheck = item.check?.find((c) => c?.checkDate === today);
  const baseChecked = todayCheck?.checked === true;
  const baseSkipped = todayCheck?.skipped === true;
  const checked = optChecked ?? baseChecked;
  const skipped = (optSkipped ?? baseSkipped) && !checked;

  // Drop each optimistic override once the real (prop) state catches up to it.
  useEffect(() => { if (optChecked !== null && baseChecked === optChecked) setOptChecked(null); }, [baseChecked, optChecked]);
  useEffect(() => { if (optSkipped !== null && baseSkipped === optSkipped) setOptSkipped(null); }, [baseSkipped, optSkipped]);

  const onCheck = async () => {
    if (pending) return;
    const next = !checked;
    setPending(true);
    setOptChecked(next);
    if (next) setOptSkipped(false); // checking clears any skipped state
    const dto: itemGroupToCheck = { routineId, ...groupDTO(item) };
    const result = await check(dto, {
      wasChecked: checked,
      motivationalPhrase,
      name,
      icon: iconId ? <BeyouIcon id={iconId} size={16} /> : undefined,
    });
    if (!result) { setOptChecked(null); setOptSkipped(null); } // failed → revert
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
    const next = !skipped;
    setPending(true);
    setOptSkipped(next);
    const dto: itemGroupToSkip = { routineId, skip: next, ...groupDTO(item) };
    const result = await skip(dto);
    if (!result) setOptSkipped(null); // failed → revert
    setPending(false);
    onChanged?.();
  };

  const timeRange = [fmt(item.startTime), fmt(item.endTime)].filter(Boolean).join(' - ');
  const xpEarned = checked ? (todayCheck?.xpGenerated ?? 0) : 0;

  return (
    <View
      className={`mt-1 flex-row items-center gap-2.5 py-1 ${skipped ? 'opacity-60' : ''}`}
      testID={`routine-item-${item.groupId}`}
    >
      <Pressable
        onPress={onCheck}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={name}
        testID={`routine-check-${item.groupId}`}
        className="shrink-0 flex-row items-center"
      >
        {xpFloat !== null && <XpFloat xp={xpFloat} />}
        {/* O anel do sistema, não um quadradinho: check-in, nível e a marca são
            a MESMA peça (ver Ring). Um checkbox de plataforma quebrava isso. */}
        <Ring size={26} state={checked ? 'done' : skipped ? 'skipped' : 'todo'} />
      </Pressable>

      {iconId ? (
        <IconTile size={30}>
          <BeyouIcon id={iconId} size={16} showFallback />
        </IconTile>
      ) : null}

      {/* A linha quebra em duas: metadados em cima, nome embaixo em largura
          cheia. Numa linha só, nome + XP + hora + pular não cabem em 390px e a
          coluna da direita saía da tela. `column-reverse` inverte só o VISUAL —
          o nome continua vindo antes na árvore, que é o que o leitor de tela lê. */}
      <View className="min-w-0 flex-1 gap-1" style={{ flexDirection: 'column-reverse' }}>
        <Text
          className={`text-[13.5px] font-medium ${
            checked || skipped ? 'text-text-3' : 'text-text'
          } ${skipped ? 'line-through' : ''}`}
          numberOfLines={2}
        >
          {name}
        </Text>

        <View className="flex-row items-center gap-1.5">
          {/* O XP fica NA LINHA depois de concluído (o XpFloat só marca o
              instante do check e some). Vem do próprio check, então sobrevive ao
              reload e mostra o valor real, já com decaimento aplicado. */}
          {xpEarned > 0 ? (
            <Chip size="sm" variant="xp" testID={`routine-xp-${item.groupId}`}>
              {`+${xpEarned} XP`}
            </Chip>
          ) : null}
          {timeRange ? (
            <Chip size="sm" variant="time">
              {timeRange}
            </Chip>
          ) : null}
          {!checked ? (
            <Pressable
              onPress={onSkip}
              disabled={pending}
              accessibilityRole="button"
              testID={`routine-skip-${item.groupId}`}
              className="flex-row items-center gap-1 rounded-control px-2 py-1 active:bg-surface-2"
            >
              <Ban size={13} color={theme.text3} />
              <Text className="text-xs font-semibold text-text-3">
                {skipped ? t('Undo skip') : t('Skip')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
