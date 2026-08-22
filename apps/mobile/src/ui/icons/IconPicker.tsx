import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import {
  searchIcons,
  getIconCategories,
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
 * Bottom-sheet icon picker mirroring the web `iconsBox` UX: search + category chips
 * (All / Recents / Icons / Emoji, with the domain categories behind "More categories")
 * + a grid of `BeyouIcon` tiles. Emits the canonical icon id (`normalizeIconId`) and
 * records a recent on select.
 */
export default function IconPicker({ visible, selectedIcon, onSelect, onClose }: IconPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showDomains, setShowDomains] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(() => iconRecents.getRecentIconIds());

  const locale = i18next.language || 'en';
  const selectedCanonical = useMemo(
    () => (selectedIcon ? normalizeIconId(selectedIcon) : ''),
    [selectedIcon],
  );

  // Type filters plus the domain categories, folded behind "More categories" so the
  // sheet does not open onto eighteen chips before the grid.
  const primaryOptions = useMemo(() => {
    const options = [{ id: 'all', label: t('IconCategoryAll') }];
    if (recentIds.length > 0) options.push({ id: 'recents', label: t('IconCategoryRecents') });
    options.push(
      { id: 'icons', label: getIconCategoryLabel('icons', locale) },
      { id: 'emoji', label: getIconCategoryLabel('emoji', locale) },
    );
    return options;
  }, [locale, recentIds.length, t]);

  const domainOptions = useMemo(
    () => getIconCategories().map((id) => ({ id, label: getIconCategoryLabel(id, locale) })),
    [locale],
  );

  const isDomainCategory = useMemo(
    () => domainOptions.some((option) => option.id === category),
    [category, domainOptions],
  );

  // Keep a chosen domain chip on screen while it is filtering the grid.
  const domainsVisible = showDomains || isDomainCategory;

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
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-text text-lg font-semibold">{t('Icon')}</Text>
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
          {primaryOptions.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setCategory(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: category === opt.id }}
              className={`rounded-full border px-3 py-1 ${
                category === opt.id ? 'border-accent bg-accent' : 'border-border'
              }`}
            >
              <Text className={`text-xs ${category === opt.id ? 'text-on-accent' : 'text-text'}`}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowDomains(!domainsVisible)}
            accessibilityRole="button"
            accessibilityState={{ expanded: domainsVisible }}
            testID="icon-picker-more-categories"
            className="rounded-full border border-border border-dashed px-3 py-1"
          >
            <Text className="text-text-2 text-xs">
              {domainsVisible ? t('IconCategoryLess') : t('IconCategoryMore')}
            </Text>
          </Pressable>
          {domainsVisible &&
            domainOptions.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setCategory(opt.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === opt.id }}
                className={`rounded-full border px-3 py-1 ${
                  category === opt.id ? 'border-accent bg-accent' : 'border-border'
                }`}
              >
                <Text className={`text-xs ${category === opt.id ? 'text-on-accent' : 'text-text'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
        </View>

        {icons.length === 0 ? (
          <Text className="text-text-2 p-4 text-center text-sm">{t('IconNoResults')}</Text>
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
                className={`items-center justify-center rounded-control py-3 ${
                  item.id === selectedCanonical ? 'border-2 border-accent' : ''
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
