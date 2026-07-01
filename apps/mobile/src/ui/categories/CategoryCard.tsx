import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { calculateLevelProgress } from '@beyou/state';
import type category from '@beyou/types/category/categoryType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface CategoryCardProps {
  category: category;
  onEdit: (category: category) => void;
  onDelete: (category: category) => void;
  /** Optional tutorial ref — passed only for the first card (index 0) to register the category-first spotlight target. */
  viewRef?: RefObject<View | null>;
}

/**
 * Category list card (mirrors the web categoryBox). Categories carry xp/level, so
 * the card shows a level bar like habits; collapsed shows icon + name +
 * description, tapping expands to reveal the full description + Edit/Delete.
 */
export default function CategoryCard({ category, onEdit, onDelete, viewRef }: CategoryCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = calculateLevelProgress(category.xp, category.actualLevelXp, category.nextLevelXp);

  return (
    <View ref={viewRef} className="rounded-2xl border border-primary/20 bg-background p-4">
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={category.name}
        accessibilityState={{ expanded }}
        testID={`category-card-${category.id}`}
        className="flex-row items-center gap-3"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={category.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={expanded ? undefined : 1}>
            {category.name}
          </Text>
          {category.description ? (
            <Text className="text-description text-sm" numberOfLines={expanded ? undefined : 2}>
              {category.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.description} />
      </Pressable>

      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-description text-xs">{t('Level')} {category.level}</Text>
          <Text className="text-description text-xs">{category.xp}/{category.nextLevelXp} xp</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {expanded ? (
        <View className="mt-4 flex-row gap-3 border-t border-primary/10 pt-3">
          <Pressable
            onPress={() => onEdit(category)}
            accessibilityRole="button"
            testID={`category-edit-${category.id}`}
            className="flex-1 items-center rounded-lg bg-primary py-2.5"
          >
            <Text style={{ color: theme.background }} className="font-semibold">{t('Edit')}</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(category)}
            accessibilityRole="button"
            testID={`category-delete-${category.id}`}
            className="flex-1 items-center rounded-lg border border-error py-2.5"
          >
            <Text className="text-error font-semibold">{t('Delete')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
