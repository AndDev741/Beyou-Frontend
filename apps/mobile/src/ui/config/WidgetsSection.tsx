import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { WIDGET_IDS, type WidgetId } from '@beyou/state';
import { widgetsIdInUseEnter } from '@beyou/state/user/perfilSlice';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

/** Human-readable i18n key per widget id (reuses the widget title keys). */
const WIDGET_LABEL_KEY: Record<WidgetId, string> = {
  worstArea: 'Worst Area',
  constance: 'Constance',
  betterArea: 'Better Area',
  dailyProgress: 'Daily Progress',
  fastTips: 'Fast Tips',
  levelProgress: 'Your life progress',
  categoryBalance: 'LifeBalance',
};

const isKnownWidget = (id: string): id is WidgetId => (WIDGET_IDS as readonly string[]).includes(id);

/**
 * Dashboard widget picker: a "Current" list (remove + reorder ↑/↓) and an
 * "Available" list (add). Edits a local working copy of the order; Save persists
 * { widgetsId } via editUser and dispatches widgetsIdInUseEnter. Mirrors the web
 * widget configuration.
 */
export default function WidgetsSection() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const savedWidgets = useSelector((s: RootState) => s.perfil.widgetsIdsInUse);

  // Local working copy — only the known widget ids, in saved order.
  const [current, setCurrent] = useState<WidgetId[]>(() =>
    (savedWidgets ?? []).filter(isKnownWidget),
  );
  const [saving, setSaving] = useState(false);

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

  const onSave = async () => {
    setSaving(true);
    const res = await editUser({ widgetsId: current });
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
    } else {
      dispatch(widgetsIdInUseEnter(current));
      notify.success(t('SuccessEditWidgets'));
    }
    setSaving(false);
  };

  return (
    <View className="gap-3" testID="config-widgets-section">
      {/* Current */}
      <View>
        <Text className="text-secondary mb-2 font-medium">{t('Current')}</Text>
        {current.length === 0 ? (
          <Text className="text-description text-sm italic" testID="widgets-current-empty">
            {t('No widgets added yet')}
          </Text>
        ) : (
          <View className="gap-2">
            {current.map((id, index) => (
              <View
                key={id}
                className="flex-row items-center justify-between rounded-md border border-primary px-3 py-2"
                testID={`widget-current-${id}`}
              >
                <Text className="text-secondary flex-1" numberOfLines={1}>
                  {t(WIDGET_LABEL_KEY[id])}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(WIDGET_LABEL_KEY[id])} up`}
                    testID={`widget-up-${id}`}
                    className={index === 0 ? 'opacity-30' : ''}
                  >
                    <Text className="text-primary text-lg font-bold">↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    disabled={index === current.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(WIDGET_LABEL_KEY[id])} down`}
                    testID={`widget-down-${id}`}
                    className={index === current.length - 1 ? 'opacity-30' : ''}
                  >
                    <Text className="text-primary text-lg font-bold">↓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => remove(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${t(WIDGET_LABEL_KEY[id])}`}
                    testID={`widget-remove-${id}`}
                  >
                    <Text className="text-error font-semibold">✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Available */}
      <View>
        <Text className="text-secondary mb-2 font-medium">{t('Availables')}</Text>
        <View className="gap-2">
          {available.map((id) => (
            <Pressable
              key={id}
              onPress={() => add(id)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${t(WIDGET_LABEL_KEY[id])}`}
              testID={`widget-add-${id}`}
              className="flex-row items-center justify-between rounded-md border border-primary/40 px-3 py-2"
            >
              <Text className="text-secondary flex-1" numberOfLines={1}>
                {t(WIDGET_LABEL_KEY[id])}
              </Text>
              <Text className="text-primary text-lg font-bold">＋</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        testID="save-widgets"
        className={`mt-4 items-center rounded-md bg-primary px-6 py-3 ${saving ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: theme.background }} className="text-base font-semibold">
          {saving ? t('Saving...') : t('Save')}
        </Text>
      </Pressable>
    </View>
  );
}
