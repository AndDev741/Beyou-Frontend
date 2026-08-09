import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react-native';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import { uuidv4 } from '../../lib/uuid';
import Input from '../Input';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import IconButton from '../IconButton';
import IconPickerField from '../icons/IconPickerField';
import BeyouIcon from '../BeyouIcon';
import TimeField from './TimeField';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

interface SectionSheetProps {
  visible: boolean;
  section: RoutineSection | null;
  onSave: (section: RoutineSection) => void;
  onClose: () => void;
}

/** Three favourite rows (44px + a 6px gap) before the list starts scrolling. */
const FAVORITES_MAX_HEIGHT = 150;

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');
const range = (start?: string, end?: string) => [fmt(start), fmt(end)].filter(Boolean).join(' - ');

export default function SectionSheet({ visible, section, onSave, onClose }: SectionSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const routines = useSelector((s: RootState) => s.routines.routines);
  const [name, setName] = useState('');
  const [iconId, setIconId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Every favourited section from ANY routine — it is a library, not just this
  // routine's. Same source as the web (the routines slice, flattened).
  const favorites = useMemo(
    () => routines.flatMap((r) => r.routineSections ?? []).filter((s) => s.favorite),
    [routines],
  );

  useEffect(() => {
    if (!visible) return;
    setName(section?.name ?? '');
    setIconId(section?.iconId ?? '');
    setStartTime(section?.startTime ?? '');
    setEndTime(section?.endTime ?? '');
    setError(undefined);
  }, [visible, section]);

  const save = () => {
    if (!name.trim()) {
      setError(t('RoutineSectionNameRequired'));
      return;
    }
    if (!startTime) {
      setError(t('RoutineSectionStartRequired'));
      return;
    }
    onSave({
      id: section?.id || uuidv4(),
      name: name.trim(),
      iconId,
      startTime,
      endTime,
      order: section?.order ?? 0,
      habitGroup: section?.habitGroup ?? [],
      taskGroup: section?.taskGroup ?? [],
      favorite: section?.favorite,
    } as RoutineSection);
    onClose();
  };

  /**
   * Copies the favourite into this routine. A fresh id on the section AND on its
   * groups: carrying the source ids would make an edit write over the original.
   */
  const useFavorite = (favorite: RoutineSection) => {
    onSave({
      ...favorite,
      id: uuidv4(),
      habitGroup: (favorite.habitGroup ?? []).map((g) => ({ ...g, id: undefined })),
      taskGroup: (favorite.taskGroup ?? []).map((g) => ({ ...g, id: undefined })),
      favorite: false,
    } as RoutineSection);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center gap-3">
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1 text-base font-semibold tracking-[-0.01em] text-text"
        >
          {t(section ? 'Edit Routine Section' : 'Creating Routine Section')}
        </Text>
        <IconButton label={t('Close')} onPress={onClose} testID="section-close">
          <X size={16} color={theme.text3} />
        </IconButton>
      </View>

      {/* The scroller SHRINKS (flexShrink) and does not take the footer with it:
          the save button stays in sight, and only the middle scrolls, only when it
          has to. */}
      <ScrollView
        className="mt-3.5"
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerClassName="gap-4"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('name')}</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('Cozy Morning')}
            accessibilityLabel={t('name')}
            compact
            testID="section-name"
          />
        </View>

        <View className="flex-row gap-3">
          <TimeField label={t('Start time')} value={startTime} onChange={setStartTime} testID="section-start" />
          <TimeField label={t('End time')} value={endTime} onChange={setEndTime} testID="section-end" />
        </View>

        <IconPickerField label={t('Icon')} value={iconId} onChange={setIconId} testID="section-icon" />

        {/* Favourite sections become templates: reusing a finished one is the
            fastest way to build the next routine. Creation only — while editing,
            swapping the section for another is not "editing". */}
        {section == null && favorites.length > 0 ? (
          <View>
            <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">
              {t('Your favorite sections')}
            </Text>
            {/* Three fit whole; from the fourth on it scrolls in here, without
                pushing the rest of the form off screen. */}
            <ScrollView
              style={{ maxHeight: FAVORITES_MAX_HEIGHT }}
              contentContainerClassName="gap-1.5"
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {favorites.map((favorite) => (
                <View
                  key={favorite.id}
                  className="flex-row items-center gap-2.5 rounded-control border border-border bg-bg px-2.5 py-2"
                >
                  {favorite.iconId ? (
                    <View className="h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft">
                      <BeyouIcon id={favorite.iconId} size={13} />
                    </View>
                  ) : null}
                  <Text
                    className="min-w-0 flex-1 text-[12.5px] font-medium text-text"
                    numberOfLines={1}
                  >
                    {favorite.name}
                  </Text>
                  <Text className="shrink-0 font-mono text-[11px] text-text-3">
                    {range(favorite.startTime, favorite.endTime)}
                  </Text>
                  <Pressable
                    onPress={() => useFavorite(favorite)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Use')} ${favorite.name}`}
                    testID={`use-favorite-${favorite.id}`}
                    className="shrink-0 rounded-control bg-accent-soft px-2.5 py-1 active:opacity-80"
                  >
                    <Text className="text-[11.5px] font-semibold text-accent">{t('Use')}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

      </ScrollView>

      {error ? <Text className="mt-2 text-[12.5px] text-danger">{error}</Text> : null}

      <View className="mt-[18px] flex-row justify-end gap-2">
        <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} testID="section-cancel" />
        <Button
          text={t(section ? 'Save section' : 'Create section')}
          mode="primary"
          size="auto"
          onPress={save}
          testID="section-save"
        />
      </View>
    </BottomSheet>
  );
}
