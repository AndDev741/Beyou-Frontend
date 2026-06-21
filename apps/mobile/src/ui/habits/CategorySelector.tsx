import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type category from '@beyou/types/category/categoryType';
import BeyouIcon from '../BeyouIcon';

interface CategorySelectorProps {
  categories: category[];
  /** Selected category ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/**
 * Multi-select category chips (mirrors the web ChooseCategories, minus inline
 * create). Toggling a chip adds/removes its id. Used by the habit form.
 */
export default function CategorySelector({ categories, value, onChange, error }: CategorySelectorProps) {
  const { t } = useTranslation();

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <View className="w-full">
      <Text className="text-secondary mb-1 text-base font-semibold">{t('Categories')}</Text>
      {categories.length === 0 ? (
        <Text className="text-description text-sm">{t('NoCategories')}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {categories.map((cat) => {
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
    </View>
  );
}
