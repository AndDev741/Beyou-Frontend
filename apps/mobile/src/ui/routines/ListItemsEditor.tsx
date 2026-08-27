import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import type { RoutineListItem } from '@beyou/types/routine/routine';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import BeyouIcon from '../BeyouIcon';
import IconButton from '../IconButton';
import GhostAdd from '../GhostAdd';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface ListItemsEditorProps {
  items: RoutineListItem[];
  habits: habit[];
  tasks: task[];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/**
 * The ordered entries of a LIST routine.
 *
 * Ordering is up/down buttons rather than a drag handle, matching how SectionCard already
 * reorders sections on this platform. The web drags; both end up sending the same thing,
 * which is the position of each row in the array.
 */
export default function ListItemsEditor({
  items,
  habits,
  tasks,
  onMove,
  onRemove,
  onAdd,
}: ListItemsEditorProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const describe = (item: RoutineListItem) => {
    const source = item.type === 'HABIT' ? habits : tasks;
    const refId = item.type === 'HABIT' ? item.habitId : item.taskId;
    const found = source.find((entry) => entry.id === refId);
    return { name: found?.name ?? t('Unknown'), iconId: found?.iconId ?? '', refId: refId ?? '' };
  };

  return (
    <View>
      <Text className="mb-2 text-[13px] font-semibold text-text-2">{t('Items')}</Text>

      {items.length === 0 ? (
        <Text className="rounded-control border border-dashed border-border px-3 py-4 text-center text-[13px] text-text-3">
          {t('ListRoutineEmptyHint')}
        </Text>
      ) : (
        <View className="gap-2">
          {items.map((item, index) => {
            const { name, iconId, refId } = describe(item);
            return (
              <View
                key={item.id || `${item.type}-${refId}-${index}`}
                className="flex-row items-center gap-2 rounded-control border border-border bg-surface px-3 py-2.5"
                testID={`list-row-${refId}`}
              >
                <BeyouIcon id={iconId} size={18} />
                <Text className="min-w-0 flex-1 text-[13.5px] text-text" numberOfLines={1}>
                  {name}
                </Text>
                {items.length > 1 ? (
                  <>
                    <IconButton
                      label={t('MoveUp')}
                      onPress={() => onMove(index, -1)}
                      disabled={index === 0}
                      testID={`list-up-${refId}`}
                    >
                      <ChevronUp size={16} color={theme.text3} />
                    </IconButton>
                    <IconButton
                      label={t('MoveDown')}
                      onPress={() => onMove(index, 1)}
                      disabled={index === items.length - 1}
                      testID={`list-down-${refId}`}
                    >
                      <ChevronDown size={16} color={theme.text3} />
                    </IconButton>
                  </>
                ) : null}
                <IconButton
                  label={`${t('Remove')} ${name}`}
                  tone="danger"
                  onPress={() => onRemove(index)}
                  testID={`list-remove-${refId}`}
                >
                  <Trash2 size={16} color={theme.error} />
                </IconButton>
              </View>
            );
          })}
        </View>
      )}

      <GhostAdd
        label={t('AddHabitOrTask')}
        onPress={onAdd}
        className="mt-2"
        testID="add-list-item"
      />
    </View>
  );
}
