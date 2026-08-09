import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil, TriangleAlert, Trash2 } from 'lucide-react-native';
import type { task } from '@beyou/types/tasks/taskType';
import BeyouIcon from '../BeyouIcon';
import Card from '../Card';
import AttributeChip from '../AttributeChip';
import Chip from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { importanceKey, difficultyKey } from '../habits/levelLabels';

interface TaskCardProps {
  task: task;
  onEdit: (task: task) => void;
  onDelete: (task: task) => void;
}

/**
 * Task card — mirror of the web's `taskBox`.
 *
 * It does not expand: importance and difficulty already show on the closed card,
 * and expanding only revealed edit/delete. Those two move up to the top; on the web
 * they appear on hover, here they stay visible (there is no hover on touch).
 */
export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const categoryEntries = Object.entries(task.categories ?? {});

  return (
    <Card testID={`task-card-${task.id}`}>
      <View className="flex-row items-start gap-2.5">
        <IconTile size={38}>
          <BeyouIcon id={task.iconId} size={20} showFallback />
        </IconTile>
        <Text
          className="min-w-0 flex-1 pt-1 text-base font-semibold leading-snug text-text"
          numberOfLines={1}
        >
          {task.name}
        </Text>

        <IconButton label={t('Edit')} onPress={() => onEdit(task)} testID={`task-edit-${task.id}`}>
          <Pencil size={15} color={theme.text3} />
        </IconButton>
        <IconButton
          label={t('Delete')}
          tone="danger"
          onPress={() => onDelete(task)}
          testID={`task-delete-${task.id}`}
        >
          <Trash2 size={15} color={theme.text3} />
        </IconButton>
      </View>

      {task.oneTimeTask ? (
        <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
          <Chip size="sm" icon={<TriangleAlert size={12} color={theme.text2} />}>
            {t('One Time Task')}
          </Chip>
          {task.markedToDelete ? (
            <Chip size="sm" variant="danger">
              {t('And Marked to Delete')}
            </Chip>
          ) : null}
        </View>
      ) : null}

      {task.description ? (
        <Text className="mt-3 text-sm leading-snug text-text-2" numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      {categoryEntries.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {categoryEntries.map(([categoryId, category], index) => (
            <Chip
              key={`${categoryId}-${index}`}
              size="sm"
              icon={<BeyouIcon id={category.iconId} size={12} />}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      ) : null}

      {/* A task has no level: the card's footer is importance and difficulty. */}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        <AttributeChip
          label={t('Importance')}
          value={task.importance ?? 0}
          phraseKey={importanceKey(task.importance ?? 0)}
        />
        <AttributeChip
          label={t('Difficulty')}
          value={task.difficulty ?? 0}
          phraseKey={difficultyKey(task.difficulty ?? 0)}
        />
      </View>
    </Card>
  );
}
