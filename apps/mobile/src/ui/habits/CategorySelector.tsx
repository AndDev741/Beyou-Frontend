import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
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
      {/* O rótulo vem do FormField que envolve o seletor. Aqui só ficam os
          chips — e o convite de nova categoria mora na própria fileira, como
          no mockup: chip tracejado que abre a criação rápida. */}
      <View className="flex-row flex-wrap gap-1.5">
        {list.map((cat) => {
          const selected = value.includes(cat.id);
          return (
            <Pressable
              key={cat.id}
              onPress={() => toggle(cat.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={cat.name}
              testID={`category-${cat.id}`}
              className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                selected ? 'border-transparent bg-accent-soft' : 'border-border'
              }`}
            >
              <BeyouIcon id={cat.iconId} size={13} />
              <Text
                className={`text-[11.5px] font-semibold ${selected ? 'text-accent' : 'text-text-2'}`}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}

        {list.length === 0 ? (
          <Text className="text-[12.5px] text-text-3">{t('YouDontHaveCategories')}</Text>
        ) : null}

        <Pressable
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('AddCategory')}
          testID="category-add-new"
          className="flex-row items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5"
        >
          <Plus size={13} color={theme.text3} />
          <Text className="text-[11.5px] font-semibold text-text-3">{t('New category')}</Text>
        </Pressable>
      </View>

      {error ? <Text className="mt-1.5 text-xs text-danger">{error}</Text> : null}

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
