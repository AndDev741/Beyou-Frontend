import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { timezoneEnter, timezoneSourceEnter, xpDecayStrategyEnter } from '@beyou/state/user/perfilSlice';
import { detectTimezone } from '../../lib/detectTimezone';
import OptionCard from './OptionCard';
import { useKeyboardLift } from '../keyboard';
import { ChevronDown } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';
import { ModalToastHost } from '../BeyouToast';

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

/**
 * Routine settings: a timezone picker (modal list of the common zones + search +
 * an auto-detect affordance via expo-localization) and the XP decay strategy
 * (three OptionCards). A single Save persists both via editUser and dispatches to
 * the perfil slice. Mirrors the web RoutineSettings component.
 */
export default function RoutineSettingsSection() {
  const { t } = useTranslation();
  // For the timezone dialog below, not for this section: the search field lives
  // in a Modal, which is its own window and which Android stopped resizing under
  // the edge-to-edge layout. See `useKeyboardLift`.
  const { lift, onLayout } = useKeyboardLift();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const currentTimezone = useSelector((s: RootState) => s.perfil.timezone) ?? 'UTC';
  const currentTimezoneSource =
    useSelector((s: RootState) => s.perfil.timezoneSource) ?? 'DEFAULT';
  const currentXpDecay = useSelector((s: RootState) => s.perfil.xpDecayStrategy) ?? 'GRADUAL';

  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
  const [selectedXpDecay, setSelectedXpDecay] = useState<XpDecayStrategy>(currentXpDecay);
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  const detectedTimezone = useMemo(detectTimezone, []);
  // Never offered to someone who picked their zone deliberately. The boot reconcile
  // already handles an account that never answered, so what is left here is the
  // mismatch nothing may decide on its own: a user who moved.
  const showDetected =
    !!detectedTimezone
    && currentTimezoneSource !== 'EXPLICIT'
    && detectedTimezone !== selectedTimezone;

  const filteredTimezones = useMemo(() => {
    const q = tzSearch.trim().toLowerCase();
    if (!q) return COMMON_TIMEZONES;
    return COMMON_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q));
  }, [tzSearch]);

  // Saves on pick: only the profile has a save button. The parameter says what
  // CHANGED in this choice — reading state here would catch the previous value.
  const persist = async (tz?: string, decay?: XpDecayStrategy) => {
    const timezone = tz ?? selectedTimezone;
    const xpDecayStrategy = decay ?? selectedXpDecay;
    const res = await editUser({ timezone, xpDecayStrategy });
    if (res?.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
    } else {
      dispatch(timezoneEnter(timezone));
      // No timezoneSource on the request: this came from the picker, so the backend
      // reads it as a person's choice and makes it permanent.
      dispatch(timezoneSourceEnter('EXPLICIT'));
      dispatch(xpDecayStrategyEnter(xpDecayStrategy));
      notify.success(t('RoutineSettingsSaved'));
    }
  };

  const selectTimezone = (tz: string) => {
    setSelectedTimezone(tz);
    setTzSearch('');
    setTzModalOpen(false);
    void persist(tz, undefined);
  };

  const selectXpDecay = (strategy: XpDecayStrategy) => {
    setSelectedXpDecay(strategy);
    void persist(undefined, strategy);
  };

  return (
    <View className="gap-3" testID="config-routine-settings">
      <View>
        <Text className="text-[12.5px] font-semibold text-text-2">{t('RoutineSettingsTitle')}</Text>
        <Text className="mt-0.5 text-xs text-text-3">{t('RoutineSettingsDescription')}</Text>
      </View>

      {/* Timezone */}
      <View>
        <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('TimezoneLabel')}</Text>
        <Pressable
          onPress={() => setTzModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('TimezoneLabel')}
          testID="timezone-trigger"
          className="flex-row items-center justify-between rounded-control border border-border bg-surface px-3 py-2.5"
        >
          <Text className="text-[13.5px] text-text">{selectedTimezone}</Text>
          <ChevronDown size={15} color={theme.text3} />
        </Pressable>

        {showDetected ? (
          <Pressable
            onPress={() => detectedTimezone && selectTimezone(detectedTimezone)}
            accessibilityRole="button"
            testID="use-detected-timezone"
            className="mt-2"
          >
            <Text className="text-[11px] text-accent underline">
              {t('UseDetectedTimezone', { timezone: detectedTimezone })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* XP decay strategy */}
      <View className="gap-2">
        <View>
          <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('XpDecayLabel')}</Text>
          <Text className="text-xs text-text-3">{t('XpDecayDescription')}</Text>
        </View>
        {XP_DECAY_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            title={t(opt.titleKey)}
            description={t(opt.descriptionKey)}
            selected={selectedXpDecay === opt.id}
            onPress={() => selectXpDecay(opt.id)}
            testID={`xp-decay-${opt.id}`}
          />
        ))}
      </View>


      <Modal
        visible={tzModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTzModalOpen(false)}
      >
        {/* Centred, and the dialog's own max-height resolves against this box, so
            giving up the bottom shrinks the list rather than hiding the search
            field the keyboard is for. */}
        <View
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onLayout={onLayout}
          style={{ paddingBottom: lift }}
          testID="timezone-modal-keyboard-avoider"
        >
          <View
            className="max-h-[70%] w-full rounded-card border-2 border-border bg-surface p-4"
            testID="timezone-modal"
          >
            <Text className="text-text mb-3 text-lg font-bold">{t('TimezoneLabel')}</Text>
            <TextInput
              value={tzSearch}
              onChangeText={setTzSearch}
              placeholder={t('TimezoneSearchPlaceholder')}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              testID="timezone-search"
              className="mb-3 rounded-control border-2 border-border px-3 py-2 text-text"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredTimezones.length === 0 ? (
                <Text className="text-text-2 px-1 py-2 text-sm italic">
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
                      className={`rounded-control px-3 py-2.5 ${active ? 'bg-accent/10' : ''}`}
                    >
                      <Text className={active ? 'text-accent font-medium' : 'text-text'}>
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
              <Text className="text-text-2 font-semibold">{t('Cancel')}</Text>
            </Pressable>
          </View>
        </View>
        {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
        <ModalToastHost />
      </Modal>
    </View>
  );
}
