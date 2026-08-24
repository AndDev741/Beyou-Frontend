import { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@beyou/api/notification/notificationPreferences';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * The engagement-mail switch, mirroring web's NotificationConfiguration.
 *
 * Loads its own state rather than reading the perfil slice: the preference does not ride
 * the profile response (it lives in its own table — see the backend's V24) and only this
 * screen renders it, so putting it in the slice would mean every login fetching a boolean
 * nothing else reads.
 *
 * Optimistic, reverting on failure. A switch that waits for a round trip before moving
 * reads as broken on a phone connection, and the cost of being wrong is one repaint.
 */
export default function NotificationSection() {
  const { theme } = useBeyouTheme();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await getNotificationPreferences();
      if (!active) return;
      // Silent on failure: nobody opened settings to read this row, so a toast about a
      // preference they have not touched is noise. The switch stays unavailable.
      if (res.error) { setEnabled(null); return; }
      setEnabled(Boolean(res.data?.engagementEmail));
    })();
    return () => { active = false; };
  }, []);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    const res = await updateNotificationPreferences(next);
    setSaving(false);
    if (res.error) {
      setEnabled(!next);
      notify.error(getFriendlyErrorMessage(t, res.error));
    }
  };

  return (
    <View className="gap-2">
      <Text className="text-text-2 text-sm font-semibold">{t('NotificationEmails')}</Text>
      <Text className="text-text-3 text-xs">{t('NotificationEmailsDescription')}</Text>

      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-text-2 flex-1 pr-3 text-sm">{t('NotificationEmailsToggle')}</Text>
        <Switch
          value={Boolean(enabled)}
          onValueChange={toggle}
          disabled={enabled === null || saving}
          testID="engagement-email-toggle"
          accessibilityLabel={t('NotificationEmailsToggle')}
          trackColor={{ true: theme.accent, false: theme.border }}
        />
      </View>

      <Text className="text-text-3 text-xs">{t('NotificationEmailsTransactionalNote')}</Text>
    </View>
  );
}
