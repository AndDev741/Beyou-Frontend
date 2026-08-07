import { useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import type { WidgetId } from '@beyou/state';
import type category from '@beyou/types/category/categoryType';
import ConstanceWidget from './ConstanceWidget';
import LevelProgressWidget from './LevelProgressWidget';
import { BetterAreaWidget, WorstAreaWidget } from './AreaWidget';
import FastTipsWidget from './FastTipsWidget';
import DailyProgressWidget from './DailyProgressWidget';
import CategoryBalanceWidget from './CategoryBalanceWidget';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import EmptyState from '../EmptyState';
import { useDismissed } from '../useDismissed';
import type { RootState } from '../../store';

/** Strongest/weakest category by XP, or null when there are no categories. */
function pickExtremeCategory(categories: category[], pick: 'more' | 'less'): category | null {
  if (categories.length === 0) return null;
  return categories.reduce((prev, current) => {
    if (pick === 'more') return prev.xp > current.xp ? prev : current;
    return prev.xp < current.xp ? prev : current;
  });
}

/**
 * Sem widgets a coluna vira um convite; quem não quiser fecha e ele não volta.
 * Espelha o EmptyState da web, inclusive o × persistido.
 */
function NoWidgets() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const [dismissed, dismiss] = useDismissed('widgets-invite');
  if (dismissed) return null;

  return (
    <EmptyState
      icon={<LayoutGrid size={20} color={theme.accent} />}
      title={t('NoWidgetsTitle')}
      description={t('NoWidgetsDescription')}
      actionLabel={t('AddWidgets')}
      onAction={() => router.push('/configuration')}
      onDismiss={dismiss}
      testID="no-widgets-empty-state"
    />
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
