import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react-native';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import BeyouIcon from '../BeyouIcon';
import GhostAdd from '../GhostAdd';
import IconButton from '../IconButton';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { mergeSectionItems, formatItemRange, type MergedSectionItem } from './sectionItems';

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

interface SectionCardProps {
  section: RoutineSection;
  index: number;
  count: number;
  habits: habit[];
  tasks: task[];
  onEdit: () => void;
  onAssign: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  /** Tira um hábito/tarefa da seção sem abrir o seletor. */
  onRemoveItem: (item: MergedSectionItem) => void;
  onToggleFavorite: () => void;
}

/** Chip de horário do cabeçalho — o mesmo par da web. */
function TimeChip({ children }: { children: string }) {
  if (!children) return null;
  return (
    <View className="rounded-full bg-surface-2 px-2 py-0.5">
      <Text className="font-mono text-[11px] font-medium text-text-3">{children}</Text>
    </View>
  );
}

/**
 * Uma seção dentro do formulário, no desenho da web: ícone, nome com chevron,
 * o par de chips de horário, favoritar, editar e excluir. Aberta, mostra os
 * itens atribuídos e o convite para adicionar mais.
 *
 * Era um cartão alto com três links de texto embaixo ("Editar · Atribuir
 * hábitos e tarefas (3) · Deletar") e a lista sempre aberta — três seções não
 * cabiam na tela.
 *
 * As setas de ordem ficam DENTRO da seção aberta: no cabeçalho seriam cinco
 * alvos numa linha de 390px, e o cabeçalho é o que precisa ficar igual ao da
 * web. Reordenar por arrasto não existe aqui (ver AGENTS.md).
 */
export default function SectionCard({
  section,
  index,
  count,
  habits,
  tasks,
  onEdit,
  onAssign,
  onMove,
  onRemove,
  onRemoveItem,
  onToggleFavorite,
}: SectionCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(false);
  const items = mergeSectionItems(section, habits, tasks);

  return (
    // A seção aberta ganha a borda de acento: é o cartão em que você está
    // mexendo. As fechadas ficam neutras, como no mockup.
    <View className={`rounded-control border bg-bg ${open ? 'border-accent' : 'border-border'}`}>
      <View className="flex-row items-center gap-2.5 p-2.5">
        <View className="shrink-0">
          {section.iconId ? (
            <BeyouIcon id={section.iconId} size={16} />
          ) : (
            <Clock size={16} color={theme.text3} />
          )}
        </View>

        {/* O horário desce para a segunda linha: numa linha só o nome da seção
            sobrava em três letras. */}
        <View className="min-w-0 flex-1">
          <Pressable
            onPress={() => setOpen((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={section.name}
            accessibilityState={{ expanded: open }}
            className="flex-row items-center"
          >
            <Text className="min-w-0 flex-1 text-[13.5px] font-semibold text-text" numberOfLines={1}>
              {section.name}
            </Text>
          </Pressable>
          <View className="mt-1 flex-row gap-1">
            <TimeChip>{fmt(section.startTime)}</TimeChip>
            <TimeChip>{fmt(section.endTime)}</TimeChip>
          </View>
        </View>

        {/* Fora da coluna do nome: ali ele ficava colado na primeira linha
            enquanto estrela, lápis e lixeira se centravam no bloco de duas.
            Ícone trocado em vez de rotacionado (ver ConfigSection). */}
        <IconButton
          label={open ? t('Collapse') : t('Expand')}
          onPress={() => setOpen((prev) => !prev)}
          testID={`section-toggle-${index}`}
        >
          {open ? (
            <ChevronUp size={16} color={theme.text3} />
          ) : (
            <ChevronDown size={16} color={theme.text3} />
          )}
        </IconButton>

        <IconButton
          label={t('Favorite')}
          onPress={onToggleFavorite}
          testID={`section-favorite-${index}`}
        >
          <Star
            size={15}
            color={section.favorite ? theme.xp : theme.text3}
            fill={section.favorite ? theme.xp : 'transparent'}
          />
        </IconButton>
        <IconButton label={t('Edit')} onPress={onEdit} testID="section-edit">
          <Pencil size={15} color={theme.text3} />
        </IconButton>
        <IconButton label={t('Delete')} tone="danger" onPress={onRemove} testID="section-remove">
          <Trash2 size={15} color={theme.text3} />
        </IconButton>
      </View>

      {open ? (
        <View className="gap-1.5 px-2.5 pb-2.5">
          {items.map((item) => {
            const range = formatItemRange(item.startTime, item.endTime);
            return (
              <View
                key={item.key}
                className="flex-row items-center gap-2.5 rounded-[9px] border border-border bg-surface px-2.5 py-[7px]"
              >
                <View className="h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft">
                  <BeyouIcon id={item.iconId} size={13} />
                </View>
                <Text className="min-w-0 flex-1 text-[12.5px] font-medium text-text" numberOfLines={1}>
                  {item.name}
                </Text>
                {range ? <TimeChip>{range}</TimeChip> : null}
                <IconButton
                  label={`${t('Delete')} ${item.name}`}
                  tone="danger"
                  onPress={() => onRemoveItem(item)}
                  testID={`section-item-remove-${item.key}`}
                >
                  <X size={14} color={theme.text3} />
                </IconButton>
              </View>
            );
          })}

          <GhostAdd label={t('Add Habit or task')} onPress={onAssign} testID="section-assign" />

          {count > 1 ? (
            <View className="flex-row items-center justify-end gap-1">
              <IconButton
                label={t('MoveUp')}
                onPress={() => onMove(-1)}
                disabled={index === 0}
                testID="section-up"
              >
                <ChevronUp size={16} color={theme.text3} />
              </IconButton>
              <IconButton
                label={t('MoveDown')}
                onPress={() => onMove(1)}
                disabled={index === count - 1}
                testID="section-down"
              >
                <ChevronDown size={16} color={theme.text3} />
              </IconButton>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
