import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  Award,
  ChartPie,
  ChevronDown,
  ChevronUp,
  Flame,
  Gauge,
  Lightbulb,
  Plus,
  Target,
  X,
} from 'lucide-react-native';
import { WIDGET_IDS, type WidgetId } from '@beyou/state';
import { widgetsIdInUseEnter } from '@beyou/state/user/perfilSlice';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import IconButton from '../IconButton';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

/** Each widget's name and icon — the list shows the identity, not the widget. */
const WIDGET_META: Record<WidgetId, { labelKey: string; Icon: typeof Target }> = {
  dailyProgress: { labelKey: 'Today', Icon: Target },
  constance: { labelKey: 'Constance', Icon: Flame },
  levelProgress: { labelKey: 'Level', Icon: Award },
  categoryBalance: { labelKey: 'LifeBalance', Icon: ChartPie },
  betterArea: { labelKey: 'Better Area', Icon: ArrowUpRight },
  worstArea: { labelKey: 'Worst Area', Icon: Gauge },
  fastTips: { labelKey: 'Fast Tips', Icon: Lightbulb },
};

const isKnownWidget = (id: string): id is WidgetId => (WIDGET_IDS as readonly string[]).includes(id);

/**
 * The web's list: every dashboard widget is a compact row with its position, icon,
 * name and the × to remove it; the leftovers become "+ name" chips.
 *
 * Two things changed to match the web: the rows now show position and icon (they
 * were name-only with three loose controls on the right), and **every change
 * persists by itself** — the Save button at the end of the section is gone.
 *
 * The web's drag handle became a pair of arrows: drag reordering does not exist
 * here (see AGENTS.md), which is why the help text has a key of its own.
 */
export default function WidgetsSection() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const savedWidgets = useSelector((s: RootState) => s.perfil.widgetsIdsInUse);

  // Working copy — known ids only, in the saved order.
  const [current, setCurrent] = useState<WidgetId[]>(() =>
    (savedWidgets ?? []).filter(isKnownWidget),
  );
  // The first render must not fire a PUT.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const persist = async () => {
      const res = await editUser({ widgetsId: current });
      if (res.error) {
        notify.error(getFriendlyErrorMessage(t, res.error));
        return;
      }
      dispatch(widgetsIdInUseEnter(current));
    };
    persist();
  }, [current, dispatch, t]);

  const available = WIDGET_IDS.filter((id) => !current.includes(id));

  const add = (id: WidgetId) => setCurrent((prev) => [...prev, id]);
  const remove = (id: WidgetId) => setCurrent((prev) => prev.filter((w) => w !== id));

  const move = (index: number, delta: number) => {
    setCurrent((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const labelOf = (id: WidgetId) => t(WIDGET_META[id].labelKey);

  return (
    <View className="gap-3" testID="config-widgets-section">
      <Text className="text-xs text-text-3">{t('WidgetsHintMobile')}</Text>

      <View>
        <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">
          {t('WidgetsInDashboard')}
        </Text>

        {current.length === 0 ? (
          <Text
            className="rounded-control border border-dashed border-border px-3 py-4 text-center text-xs text-text-3"
            testID="widgets-current-empty"
          >
            {t('No widgets added yet')}
          </Text>
        ) : (
          <View className="gap-1.5">
            {current.map((id, index) => {
              const { Icon } = WIDGET_META[id];
              return (
                <View
                  key={id}
                  className="flex-row items-center gap-2.5 rounded-control border border-border bg-surface px-2.5 py-2"
                  testID={`widget-current-${id}`}
                >
                  <Text className="w-3 shrink-0 font-mono text-[11px] text-text-3">{index + 1}</Text>
                  <Icon size={14} color={theme.accent} />
                  <Text
                    className="min-w-0 flex-1 text-[12.5px] font-semibold text-text"
                    numberOfLines={1}
                  >
                    {labelOf(id)}
                  </Text>
                  <IconButton
                    label={`${t('MoveUp')} ${labelOf(id)}`}
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    testID={`widget-up-${id}`}
                  >
                    <ChevronUp size={14} color={theme.text3} />
                  </IconButton>
                  <IconButton
                    label={`${t('MoveDown')} ${labelOf(id)}`}
                    onPress={() => move(index, 1)}
                    disabled={index === current.length - 1}
                    testID={`widget-down-${id}`}
                  >
                    <ChevronDown size={14} color={theme.text3} />
                  </IconButton>
                  <IconButton
                    label={`${t('Remove')} ${labelOf(id)}`}
                    tone="danger"
                    onPress={() => remove(id)}
                    testID={`widget-remove-${id}`}
                  >
                    <X size={14} color={theme.text3} />
                  </IconButton>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {available.length > 0 ? (
        <View>
          <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('Availables')}</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {available.map((id) => (
              <Pressable
                key={id}
                onPress={() => add(id)}
                accessibilityRole="button"
                accessibilityLabel={`${t('Add')} ${labelOf(id)}`}
                testID={`widget-add-${id}`}
                className="flex-row items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 active:opacity-70"
              >
                <Plus size={13} color={theme.text3} />
                <Text className="text-[11.5px] font-semibold text-text-3">{labelOf(id)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
