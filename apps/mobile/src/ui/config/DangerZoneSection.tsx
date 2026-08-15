import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import IconTile from '../IconTile';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import DeleteAccountSheet from './DeleteAccountSheet';

/**
 * Leaving, on a phone.
 *
 * The web's danger zone also offers a copy of your data; this one does not. Writing
 * the export to disk is easy here, but handing it to the user needs the OS share
 * sheet (expo-sharing), a native module that is not installed — and adding one costs
 * an APK rebuild for a file that reads better on a desktop anyway. The route is the
 * same either way, so it can move here the next time the app is rebuilt.
 */
export default function DangerZoneSection() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [deleting, setDeleting] = useState(false);

  return (
    <View className="w-full rounded-card border border-danger/30 bg-surface p-4">
      <Text accessibilityRole="header" className="text-[13.5px] font-semibold text-danger">
        {t('ConfigSectionDangerZone')}
      </Text>

      <View className="mt-3">
        <Pressable
          onPress={() => setDeleting(true)}
          accessibilityRole="button"
          accessibilityLabel={t('DeleteMyAccount')}
          testID="delete-my-account"
          className="w-full flex-row items-center gap-3 rounded-control border border-border p-3 active:bg-surface-2"
        >
          <IconTile tone="neutral" size={36} className="bg-danger/10">
            <Trash2 size={16} color={theme.danger} />
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-semibold text-danger">{t('DeleteMyAccount')}</Text>
            <Text className="text-[12px] leading-snug text-text-3">{t('DeleteAccountHint')}</Text>
          </View>
        </Pressable>
      </View>

      {/* Mounted only while open, so closing throws the half-finished deletion away
          instead of leaving it to reappear on the first frame of the next opening —
          and a request abandoned on the way out has nothing left to write into. */}
      {deleting ? <DeleteAccountSheet visible onClose={() => setDeleting(false)} /> : null}
    </View>
  );
}
