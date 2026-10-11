import { useEffect, useRef, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@beyou/api/notification/notificationPreferences';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import TimeField from '../routines/TimeField';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

type ReminderPrefs = { reminderEmail: boolean; reminderDefaultTime: string };

/** The server's default for a task with no time, if a response ever leaves it out. */
const DEFAULT_TIME = '09:00';

/**
 * Calendar reminders on the phone (R12, R13): the email for a missed reminder and the time a
 * task without one gets reminded. No notification switch: the app shows none yet, so a toggle
 * for one would promise something that never arrives.
 *
 * Independent of the engagement mail above it. Each control saves only its own field (the PUT
 * is partial), so flipping one can never reset the other.
 *
 * Optimistic and reverting on failure, like NotificationSection: a control that waits for a
 * round trip before moving reads as broken on a phone connection.
 *
 * One save at a time. Both controls are disabled while a save is out, and a failure puts back
 * only the field that failed. Two saves in flight each held their own picture of "before", and
 * the one that failed restored a picture that no longer matched, moving the other field with it.
 */
export default function ReminderSection() {
  const { theme } = useBeyouTheme();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  // State lags a render behind; a second change inside the same frame would read `false`.
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await getNotificationPreferences();
      if (!active) return;
      // Silent on failure, like the engagement switch: the controls stay unavailable.
      if (res.error || !res.data) {
        setPrefs(null);
        return;
      }
      setPrefs({
        reminderEmail: res.data.reminderEmail ?? true,
        reminderDefaultTime: (res.data.reminderDefaultTime ?? DEFAULT_TIME).slice(0, 5),
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async <K extends keyof ReminderPrefs>(field: K, value: ReminderPrefs[K]) => {
    if (!prefs || inFlight.current) return;
    const previous = prefs[field];
    inFlight.current = true;
    setPrefs((current) => (current ? { ...current, [field]: value } : current));
    setSaving(true);
    const res = await updateNotificationPreferences({ [field]: value });
    inFlight.current = false;
    setSaving(false);
    if (res.error) {
      setPrefs((current) => (current ? { ...current, [field]: previous } : current));
      notify.error(getFriendlyErrorMessage(t, res.error));
    }
  };

  return (
    <View className="gap-2" testID="reminder-section">
      <Text className="text-sm font-semibold text-text-2">{t('Reminders')}</Text>
      <Text className="text-xs text-text-3">{t('RemindersDescription')}</Text>

      <View className="mt-1 flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-sm text-text-2">{t('ReminderEmailToggle')}</Text>
        <Switch
          value={Boolean(prefs?.reminderEmail)}
          onValueChange={(next) => void save('reminderEmail', next)}
          disabled={prefs === null || saving}
          testID="reminder-email-toggle"
          accessibilityLabel={t('ReminderEmailToggle')}
          trackColor={{ true: theme.accent, false: theme.border }}
        />
      </View>
      <Text className="text-xs text-text-3">{t('ReminderEmailHint')}</Text>

      <View className="mt-1 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-text-2">{t('ReminderDefaultTime')}</Text>
        <View className="w-24">
          {prefs ? (
            <TimeField
              value={prefs.reminderDefaultTime}
              onChange={(time) => {
                if (time !== prefs.reminderDefaultTime) void save('reminderDefaultTime', time);
              }}
              disabled={saving}
              testID="reminder-default-time"
            />
          ) : (
            <View
              className="min-h-[42px] justify-center rounded-control border border-border bg-surface-2 px-3"
              testID="reminder-default-time-unavailable"
            >
              <Text className="font-mono text-[13.5px] text-text-3">--:--</Text>
            </View>
          )}
        </View>
      </View>

      <Text className="text-xs text-text-3">{t('CalendarMobileRemindersNote')}</Text>
    </View>
  );
}
