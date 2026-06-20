import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import type { WidgetId } from '@beyou/state';
import type category from '@beyou/types/category/categoryType';
import ConstanceWidget from './ConstanceWidget';
import LevelProgressWidget from './LevelProgressWidget';
import { BetterAreaWidget, WorstAreaWidget } from './AreaWidget';
import FastTipsWidget from './FastTipsWidget';
import DailyProgressWidget from './DailyProgressWidget';
import CategoryBalanceWidget from './CategoryBalanceWidget';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

/** Strongest/weakest category by XP, or null when there are no categories. */
function pickExtremeCategory(categories: category[], pick: 'more' | 'less'): category | null {
  if (categories.length === 0) return null;
  return categories.reduce((prev, current) => {
    if (pick === 'more') return prev.xp > current.xp ? prev : current;
    return prev.xp < current.xp ? prev : current;
  });
}

/** Empty state shown when the user has no widgets configured — mirrors the
 *  shared web EmptyState (bordered card, emoji, title/desc, CTA to config). */
function NoWidgets() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  return (
    <View
      className="w-full items-center justify-center rounded-xl border-2 border-primary bg-background p-8"
      testID="no-widgets-empty-state"
    >
      <Text className="mb-3 text-5xl" accessibilityElementsHidden>
        🧩
      </Text>
      <Text className="text-secondary text-lg font-semibold">{t('NoWidgetsTitle')}</Text>
      <Text className="text-description mt-2 text-center text-sm">{t('NoWidgetsDescription')}</Text>
      <Pressable
        onPress={() => router.push('/configuration')}
        accessibilityRole="button"
        testID="add-widgets-cta"
        className="mt-4 rounded-[20px] bg-primary px-6 py-2"
      >
        <Text style={{ color: theme.background }} className="font-semibold">
          {t('AddWidgets')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Renders the user's configured dashboard widgets (perfil.widgetsIdsInUse order),
 * stacked full-width. Reads all widget data straight from redux (perfil + the
 * categories slice). Unknown ids are skipped; an empty list shows the NoWidgets
 * CTA. Mirrors the web dashboard widget board, minus the wrap/bigSize layout.
 */
export default function DashboardWidgets() {
  const widgetsIdsInUse = useSelector((s: RootState) => s.perfil.widgetsIdsInUse);
  const categories = useSelector((s: RootState) => s.categories.categories);
  const constance = useSelector((s: RootState) => s.perfil.constance);
  const xp = useSelector((s: RootState) => s.perfil.xp);
  const level = useSelector((s: RootState) => s.perfil.level);
  const nextLevelXp = useSelector((s: RootState) => s.perfil.nextLevelXp);
  const actualLevelXp = useSelector((s: RootState) => s.perfil.actualLevelXp);
  const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
  const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);

  const categoryWithMoreXp = useMemo(() => pickExtremeCategory(categories, 'more'), [categories]);
  const categoryWithLessXp = useMemo(() => pickExtremeCategory(categories, 'less'), [categories]);

  const widgetMap: Record<WidgetId, () => React.ReactElement> = {
    worstArea: () => <WorstAreaWidget category={categoryWithLessXp} />,
    constance: () => <ConstanceWidget constance={constance} />,
    betterArea: () => <BetterAreaWidget category={categoryWithMoreXp} />,
    dailyProgress: () => <DailyProgressWidget checked={checked} total={total} />,
    fastTips: () => <FastTipsWidget />,
    levelProgress: () => (
      <LevelProgressWidget
        level={level}
        xp={xp}
        nextLevelXp={nextLevelXp}
        actualLevelXp={actualLevelXp}
      />
    ),
    categoryBalance: () => <CategoryBalanceWidget categories={categories} />,
  };

  if (!widgetsIdsInUse || widgetsIdsInUse.length === 0) {
    return <NoWidgets />;
  }

  return (
    <View className="w-full gap-3" testID="dashboard-widgets">
      {widgetsIdsInUse.map((id) => {
        const render = widgetMap[id as WidgetId];
        if (!render) return null; // unknown id → skip
        return <View key={id}>{render()}</View>;
      })}
    </View>
  );
}
