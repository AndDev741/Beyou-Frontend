import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import getCategories from '@beyou/api/categories/getCategories';
import type category from '@beyou/types/category/categoryType';
import BeyouIcon from '../BeyouIcon';
import CategoryForm from '../categories/CategoryForm';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface CategorySelectorProps {
  categories: category[];
  /** Selected category ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/**
 * Multi-select category chips (mirrors the web ChooseCategories). Toggling a chip
 * adds/removes its id. A "+ New" chip opens the CategoryForm inline; on create it
 * refetches categories and auto-selects the new one (matched by name + icon, like web).
 */
export default function CategorySelector({ categories, value, onChange, error }: CategorySelectorProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<{ name: string; iconId: string } | null>(null);
  // After inline-create we refetch locally (no redux dep) and render the merged list.
  const [fetched, setFetched] = useState<category[] | null>(null);
  const list = fetched ?? categories;

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  const handleCreated = async (values: { name: string; iconId: string }) => {
    setPending(values);
    const res = await getCategories(t);
    if (Array.isArray(res.success)) setFetched(res.success);
  };

  // Once the refetched categories arrive, auto-select the just-created one.
  useEffect(() => {
    if (!pending) return;
    const match =
      list.find((c) => c.name === pending.name && c.iconId === pending.iconId) ??
      list.find((c) => c.name === pending.name);
    if (match) {
      if (!value.includes(match.id)) onChange([...value, match.id]);
      setPending(null);
    }
  }, [list, pending, value, onChange]);

  return (
    <View className="w-full">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-secondary text-base font-semibold">{t('Categories')}</Text>
        <Pressable
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('AddCategory')}
          testID="category-add-new"
          className="flex-row items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1"
        >
          <Ionicons name="add" size={14} color={theme.primary} />
          <Text className="text-primary text-xs font-semibold">{t('AddCategory')}</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <Text className="text-description text-sm">{t('NoCategories')}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {list.map((cat) => {
            const selected = value.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggle(cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={cat.name}
                testID={`category-${cat.id}`}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                  selected ? 'border-primary bg-primary/10' : 'border-primary/30'
                }`}
              >
                <BeyouIcon id={cat.iconId} size={16} />
                <Text className={`text-sm ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {error ? <Text className="text-error mt-1 text-sm">{error}</Text> : null}

      {createOpen ? (
        <CategoryForm
          visible
          mode="create"
          onCreated={handleCreated}
          onSaved={() => {}}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </View>
  );
}
