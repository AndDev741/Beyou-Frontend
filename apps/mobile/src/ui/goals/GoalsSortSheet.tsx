import { useState } from 'react';
import { Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setViewSort } from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import BottomSheet from '../BottomSheet';
import type { RootState, AppDispatch } from '../../store';

/** value → i18n key, mirroring the web goals SortFilterBar options. */
const OPTIONS: { value: string; key: string }[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'xp-desc', key: 'XP Reward (High to Low)' },
  { value: 'xp-asc', key: 'XP Reward (Low to High)' },
  { value: 'progress-desc', key: 'Progress (High to Low)' },
  { value: 'progress-asc', key: 'Progress (Low to High)' },
  { value: 'end-asc', key: 'End date (Sooner first)' },
  { value: 'end-desc', key: 'End date (Later first)' },
  { value: 'start-desc', key: 'Newest first' },
  { value: 'start-asc', key: 'Oldest first' },
];

/** A pill showing the current goal sort that opens a bottom-sheet of options.
 *  Sort state lives in the shared `viewFilters` slice (same as web). */
export default function GoalsSortSheet() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const sortBy = useSelector((s: RootState) => s.viewFilters.goals);
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === sortBy) ?? OPTIONS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('Sort results')}
        testID="goals-sort"
        className="flex-row items-center gap-1.5 self-start rounded-full border border-primary/30 px-3 py-1.5"
      >
        <Ionicons name="swap-vertical" size={16} color={theme.primary} />
        <Text className="text-secondary text-sm">{t(current.key)}</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} closeLabel="Close" maxHeight="max-h-[70%]">
          <Text className="text-secondary mb-2 text-lg font-bold">{t('Sort results')}</Text>
          <ScrollView>
            {OPTIONS.map((o) => {
              const selected = o.value === sortBy;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    dispatch(setViewSort({ view: 'goals', sortBy: o.value }));
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`sort-${o.value}`}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className={selected ? 'text-primary font-semibold' : 'text-secondary'}>{t(o.key)}</Text>
                  {selected ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
      </BottomSheet>
    </>
  );
}
