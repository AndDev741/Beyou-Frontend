import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import {
  searchIcons,
  getIconCategoryLabel,
  normalizeIconId,
  getEntryById,
  type IconEntry,
} from '@beyou/icons';
import BeyouIcon from '../BeyouIcon';
import Input from '../Input';
import BottomSheet from '../BottomSheet';
import { iconRecents } from './iconRecents';

const NUM_COLUMNS = 6;
const LIMIT = 48;

interface IconPickerProps {
  visible: boolean;
  selectedIcon?: string | null;
  onSelect: (iconId: string) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet icon picker mirroring the web `iconsBox` UX: search + category tabs
 * (All / Recents / Icons / Emoji) + a grid of `BeyouIcon` tiles. Emits the canonical
 * icon id (`normalizeIconId`) and records a recent on select.
 */
export default function IconPicker({ visible, selectedIcon, onSelect, onClose }: IconPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [recentIds, setRecentIds] = useState<string[]>(() => iconRecents.getRecentIconIds());

  const locale = i18next.language || 'en';
  const selectedCanonical = useMemo(
    () => (selectedIcon ? normalizeIconId(selectedIcon) : ''),
    [selectedIcon],
  );

  const categoryOptions = useMemo(() => {
    const options = [{ id: 'all', label: t('IconCategoryAll') }];
    if (recentIds.length > 0) options.push({ id: 'recents', label: t('IconCategoryRecents') });
    options.push(
      { id: 'icons', label: getIconCategoryLabel('icons', locale) },
      { id: 'emoji', label: getIconCategoryLabel('emoji', locale) },
    );
    return options;
  }, [locale, recentIds.length, t]);

  const recentEntries = useMemo(
    () => recentIds.map((id) => getEntryById(id)).filter(Boolean) as IconEntry[],
    [recentIds],
  );

  const icons = useMemo(() => {
    if (category === 'recents') return recentEntries;
    return searchIcons({ query: search, locale, category, limit: LIMIT });
  }, [category, locale, search, recentEntries]);

  const handleSelect = (iconId: string) => {
    const canonical = normalizeIconId(iconId);
    iconRecents.pushRecentIconId(canonical);
    setRecentIds(iconRecents.getRecentIconIds());
    onSelect(canonical);
    onClose();
  };

  // RN Modal renders children regardless of `visible` under jest; gate here so a
  // closed picker mounts nothing (also skips the 48-tile FlatList when closed).
  if (!visible) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close" maxHeight="max-h-[80%]">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-secondary text-lg font-semibold">{t('Icon')}</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('Close')}
            testID="icon-picker-close"
          >
            <BeyouIcon id="lucide:x" size={24} />
          </Pressable>
        </View>

        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t('IconPlaceholder')}
          autoCapitalize="none"
          testID="icon-picker-search"
        />

        <View className="my-3 flex-row flex-wrap gap-2">
          {categoryOptions.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setCategory(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: category === opt.id }}
              className={`rounded-full border px-3 py-1 ${
                category === opt.id ? 'border-primary bg-primary' : 'border-primary/30'
              }`}
            >
              <Text className={`text-xs ${category === opt.id ? 'text-background' : 'text-secondary'}`}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {icons.length === 0 ? (
          <Text className="text-description p-4 text-center text-sm">{t('IconNoResults')}</Text>
        ) : (
          <FlatList
            key={NUM_COLUMNS}
            data={icons}
            numColumns={NUM_COLUMNS}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t('Icon')}: ${item.label}`}
                accessibilityState={{ selected: item.id === selectedCanonical }}
                style={{ width: `${100 / NUM_COLUMNS}%` }}
                className={`items-center justify-center rounded-md py-3 ${
                  item.id === selectedCanonical ? 'border-2 border-primary' : ''
                }`}
              >
                <BeyouIcon id={item.id} size={28} />
              </Pressable>
            )}
          />
        )}
    </BottomSheet>
  );
}
