import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Flame, Pencil, Trash2 } from 'lucide-react-native';
import type { habit } from '@beyou/types/habit/habitType';
import BeyouIcon from '../BeyouIcon';
import Chip from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import AttributeChip from '../AttributeChip';
import StatTile from '../StatTile';
import XpBar from '../XpBar';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { importanceKey, difficultyKey } from './levelLabels';

interface HabitCardProps {
  habit: habit;
  onEdit: (habit: habit) => void;
  onDelete: (habit: habit) => void;
  /** Alvo do tutorial — só o primeiro cartão recebe (`habit-first`). */
  viewRef?: RefObject<View | null>;
}

/**
 * Cartão de hábito — espelho do `habitBox` da web. Fechado mostra ícone, nome,
 * descrição em duas linhas, categorias e a linha de nível/XP/sequência.
 * Expandir solta o clamp e revela rotinas, frase, atributos e os números.
 *
 * Editar e excluir ficam no topo, à esquerda do chevron. Na web eles aparecem
 * no hover; aqui não existe hover, então ficam sempre visíveis — a mesma regra
 * que a web aplica abaixo de `md`.
 */
export default function HabitCard({ habit, onEdit, onDelete, viewRef }: HabitCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);
  const routineNames = Object.values(habit.routines ?? {});

  return (
    <View ref={viewRef} className="rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-start gap-2.5">
        <IconTile size={38}>
          <BeyouIcon id={habit.iconId} size={20} showFallback />
        </IconTile>

        <Pressable
          onPress={() => setExpanded((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={habit.name}
          accessibilityState={{ expanded }}
          testID={`habit-card-${habit.id}`}
          className="min-w-0 flex-1 pt-1"
        >
          <Text
            className="text-base font-semibold leading-snug text-text"
            numberOfLines={expanded ? undefined : 1}
          >
            {habit.name}
          </Text>
        </Pressable>

        <IconButton label={t('Edit')} onPress={() => onEdit(habit)} testID={`habit-edit-${habit.id}`}>
          <Pencil size={15} color={theme.text2} />
        </IconButton>
        <IconButton
          label={t('Delete')}
          tone="danger"
          onPress={() => onDelete(habit)}
          testID={`habit-delete-${habit.id}`}
        >
          <Trash2 size={15} color={theme.danger} />
        </IconButton>
        <IconButton
          label={expanded ? t('Collapse') : t('Expand')}
          onPress={() => setExpanded((open) => !open)}
          testID={`habit-expand-${habit.id}`}
        >
          {expanded ? (
            <ChevronUp size={18} color={theme.text3} />
          ) : (
            <ChevronDown size={18} color={theme.text3} />
          )}
        </IconButton>
      </View>

      {habit.description ? (
        <Text className="mt-3 text-sm leading-snug text-text-2" numberOfLines={expanded ? undefined : 2}>
          {habit.description}
        </Text>
      ) : null}

      {habit.categories?.length ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {habit.categories.map((category, index) => (
            <Chip
              key={`${category.id}-${index}`}
              size="sm"
              icon={<BeyouIcon id={category.iconId} size={12} />}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      ) : null}

      {expanded && routineNames.length > 0 ? (
        <View className="mt-3">
          <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
            {t('UsingIn')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {routineNames.map((routineName) => (
              <Chip key={String(routineName)} size="sm">
                {String(routineName)}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      {expanded && habit.motivationalPhrase ? (
        <View className="mt-3 rounded-control border-l-2 border-accent bg-surface-2 px-3 py-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            {t('MotivationPhrase')}
          </Text>
          <Text className="mt-0.5 text-sm italic text-text-2">{habit.motivationalPhrase}</Text>
        </View>
      ) : null}

      {expanded ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          <AttributeChip
            label={t('Importance')}
            value={habit.importance}
            phraseKey={importanceKey(habit.importance)}
          />
          <AttributeChip
            label={t('Difficulty')}
            value={habit.dificulty}
            phraseKey={difficultyKey(habit.dificulty)}
          />
        </View>
      ) : null}

      {expanded ? (
        <View className="mt-3 flex-row gap-2">
          <StatTile
            className="flex-1"
            label={t('Level')}
            value={habit.level}
            hint={`${habit.xp}/${habit.nextLevelXp} XP`}
          />
          <StatTile className="flex-1" label={t('Constance')} value={habit.constance} hint={t('Days')} />
        </View>
      ) : null}

      {/* A linha que se lê de relance: nível, XP e sequência. */}
      <View className="mt-3 flex-row items-end gap-3">
        <XpBar className="min-w-0 flex-1" current={habit.xp} target={habit.nextLevelXp} level={habit.level} />
        {/* Sem sequência não há o que celebrar: uma chama apagada com zero ao
            lado lê como falha, não como estado neutro. */}
        {habit.constance > 0 ? (
          <Chip variant="flame" size="sm" icon={<Flame size={12} color={theme.flame} />}>
            {habit.constance}
          </Chip>
        ) : null}
      </View>
    </View>
  );
}
