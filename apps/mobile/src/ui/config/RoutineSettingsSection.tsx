import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getCalendars } from 'expo-localization';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { timezoneEnter, xpDecayStrategyEnter } from '@beyou/state/user/perfilSlice';
import OptionCard from './OptionCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

type XpDecayStrategy = 'GRADUAL' | 'FLAT' | 'TIME_WINDOW';

// Same ~23 IANA zones as the web RoutineSettings list.
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Bogota',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Lisbon',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const XP_DECAY_OPTIONS: Array<{ id: XpDecayStrategy; titleKey: string; descriptionKey: string }> = [
  { id: 'GRADUAL', titleKey: 'Gradual', descriptionKey: 'Gradual description' },
  { id: 'FLAT', titleKey: 'Flat', descriptionKey: 'Flat description' },
  { id: 'TIME_WINDOW', titleKey: 'Time Window', descriptionKey: 'Time Window description' },
];

function detectTimezone(): string | null {
  try {
    return getCalendars()[0]?.timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Routine settings: a timezone picker (modal list of the common zones + search +
 * an auto-detect affordance via expo-localization) and the XP decay strategy
 * (three OptionCards). A single Save persists both via editUser and dispatches to
 * the perfil slice. Mirrors the web RoutineSettings component.
 */
export default function RoutineSettingsSection() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const currentTimezone = useSelector((s: RootState) => s.perfil.timezone) ?? 'UTC';
  const currentXpDecay = useSelector((s: RootState) => s.perfil.xpDecayStrategy) ?? 'GRADUAL';

  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
  const [selectedXpDecay, setSelectedXpDecay] = useState<XpDecayStrategy>(currentXpDecay);
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const detectedTimezone = useMemo(detectTimezone, []);
  const showDetected = !!detectedTimezone && detectedTimezone !== selectedTimezone;

  const filteredTimezones = useMemo(() => {
    const q = tzSearch.trim().toLowerCase();
    if (!q) return COMMON_TIMEZONES;
    return COMMON_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q));
  }, [tzSearch]);

  const selectTimezone = (tz: string) => {
    setSelectedTimezone(tz);
    setTzSearch('');
    setTzModalOpen(false);
  };

  const onSave = async () => {
    setSaving(true);
    const res = await editUser({ timezone: selectedTimezone, xpDecayStrategy: selectedXpDecay });
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
    } else {
      dispatch(timezoneEnter(selectedTimezone));
      dispatch(xpDecayStrategyEnter(selectedXpDecay));
      notify.success(t('RoutineSettingsSaved'));
    }
    setSaving(false);
  };

  return (
    <View className="gap-3" testID="config-routine-settings">
      <View>
        <Text className="text-secondary text-base font-semibold">{t('RoutineSettingsTitle')}</Text>
        <Text className="text-description mt-0.5 text-sm">{t('RoutineSettingsDescription')}</Text>
      </View>

      {/* Timezone */}
      <View>
        <Text className="text-secondary mb-1 font-medium">{t('TimezoneLabel')}</Text>
        <Pressable
          onPress={() => setTzModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('TimezoneLabel')}
          testID="timezone-trigger"
          className="flex-row items-center justify-between rounded-md border border-primary px-3 py-3"
        >
          <Text className="text-secondary">{selectedTimezone}</Text>
          <Text className="text-description">{'▼'}</Text>
        </Pressable>

        {showDetected ? (
          <Pressable
            onPress={() => detectedTimezone && selectTimezone(detectedTimezone)}
            accessibilityRole="button"
            testID="use-detected-timezone"
            className="mt-2"
          >
            <Text className="text-primary text-sm font-medium underline">
              {t('UseDetectedTimezone', { timezone: detectedTimezone })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* XP decay strategy */}
      <View className="gap-2">
        <View>
          <Text className="text-secondary font-medium">{t('XpDecayLabel')}</Text>
          <Text className="text-description mt-0.5 text-sm">{t('XpDecayDescription')}</Text>
        </View>
        {XP_DECAY_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            title={t(opt.titleKey)}
            description={t(opt.descriptionKey)}
            selected={selectedXpDecay === opt.id}
            onPress={() => setSelectedXpDecay(opt.id)}
            testID={`xp-decay-${opt.id}`}
          />
        ))}
      </View>

      <Pressable
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        testID="save-routine-settings"
        className={`items-center rounded-md bg-primary px-6 py-3 ${saving ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: theme.background }} className="text-base font-semibold">
          {saving ? t('Saving...') : t('Save')}
        </Text>
      </Pressable>

      <Modal
        visible={tzModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTzModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View
            className="max-h-[70%] w-full rounded-2xl border-2 border-primary bg-background p-4"
            testID="timezone-modal"
          >
            <Text className="text-secondary mb-3 text-lg font-bold">{t('TimezoneLabel')}</Text>
            <TextInput
              value={tzSearch}
              onChangeText={setTzSearch}
              placeholder={t('TimezoneSearchPlaceholder')}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              testID="timezone-search"
              className="mb-3 rounded-md border-2 border-primary px-3 py-2 text-secondary"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredTimezones.length === 0 ? (
                <Text className="text-description px-1 py-2 text-sm italic">
                  {t('No timezones found')}
                </Text>
              ) : (
                filteredTimezones.map((tz) => {
                  const active = selectedTimezone === tz;
                  return (
                    <Pressable
                      key={tz}
                      onPress={() => selectTimezone(tz)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      testID={`timezone-option-${tz}`}
                      className={`rounded-md px-3 py-2.5 ${active ? 'bg-primary/10' : ''}`}
                    >
                      <Text className={active ? 'text-primary font-medium' : 'text-secondary'}>
                        {tz}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable
              onPress={() => setTzModalOpen(false)}
              accessibilityRole="button"
              className="mt-3 items-end px-2 py-1"
            >
              <Text className="text-description font-semibold">{t('Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
