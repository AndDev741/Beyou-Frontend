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
  /** Drops a habit/task from the section without opening the picker. */
  onRemoveItem: (item: MergedSectionItem) => void;
  onToggleFavorite: () => void;
}

/** Header time chip — the same pair the web shows. */
function TimeChip({ children }: { children: string }) {
  if (!children) return null;
  return (
    <View className="rounded-full bg-surface-2 px-2 py-0.5">
      <Text className="font-mono text-[11px] font-medium text-text-3">{children}</Text>
    </View>
  );
}

/**
 * A section inside the form, in the web's design: icon, name with a chevron, the
 * pair of time chips, favourite, edit and delete. Open, it shows the assigned
 * items and the invitation to add more.
 *
 * It used to be a tall card with three text links underneath ("Edit · Assign
 * habits and tasks (3) · Delete") and the list always open — three sections did
 * not fit on screen.
 *
 * The order arrows live INSIDE the open section: in the header they would be a
 * fifth and sixth target on a 390px row, and the header is what has to match the
 * web. Drag reordering does not exist here (see AGENTS.md).
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
    // The open section takes the accent border: it is the card being worked on.
    // Closed ones stay neutral, as in the mockup.
    <View className={`rounded-control border bg-bg ${open ? 'border-accent' : 'border-border'}`}>
      <View className="flex-row items-center gap-2.5 p-2.5">
        <View className="shrink-0">
          {section.iconId ? (
            <BeyouIcon id={section.iconId} size={16} />
          ) : (
            <Clock size={16} color={theme.text3} />
          )}
        </View>

        {/* The time drops to a second line: on one line the section's name was left
            with three letters. */}
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

        {/* Outside the name column: in there it stuck to the first line while the
            star, pencil and bin centred on the two-line block. A swapped icon rather
            than a rotated one (see ConfigSection). */}
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
