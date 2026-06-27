import { useState } from 'react';
import { Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setViewSort } from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import BottomSheet from '../BottomSheet';
import type { RootState, AppDispatch } from '../../store';

/** value → i18n key, mirroring the web tasks SortFilterBar options.
 *  Tasks have no level/xp sorts (cf. habits). */
const OPTIONS: { value: string; key: string }[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'importance-desc', key: 'Importance (High to Low)' },
  { value: 'importance-asc', key: 'Importance (Low to High)' },
  { value: 'difficulty-desc', key: 'Difficulty (High to Low)' },
  { value: 'difficulty-asc', key: 'Difficulty (Low to High)' },
  { value: 'created-desc', key: 'Newest first' },
  { value: 'created-asc', key: 'Oldest first' },
];

/** A pill showing the current task sort that opens a bottom-sheet of options.
 *  Sort state lives in the shared `viewFilters` slice (same as web). */
export default function TasksSortSheet() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const sortBy = useSelector((s: RootState) => s.viewFilters.tasks);
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === sortBy) ?? OPTIONS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('Sort results')}
        testID="tasks-sort"
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
                    dispatch(setViewSort({ view: 'tasks', sortBy: o.value }));
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
