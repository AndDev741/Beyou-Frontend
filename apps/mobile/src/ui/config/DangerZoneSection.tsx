import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Trash2 } from 'lucide-react-native';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import IconTile from '../IconTile';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { exportMyData } from '../../lib/exportMyData';
import { notify } from '../../notify';
import DeleteAccountSheet from './DeleteAccountSheet';

/**
 * The two things that only belong together: take your data with you, and leave.
 *
 * The export used to be missing here, and the privacy policy said so out loud —
 * Android users were told to ask by email. Handing a file to someone on a phone
 * needs the OS share sheet rather than a download, so `exportMyData` writes it to
 * the app's own cache and lets the person choose where it lands.
 */
export default function DangerZoneSection() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const onDownload = async () => {
    setDownloading(true);
    const result = await exportMyData();
    setDownloading(false);
    if (result.error) {
      notify.error(getFriendlyErrorMessage(t, result.error));
    }
  };

  return (
    <View className="w-full rounded-card border border-danger/30 bg-surface p-4">
      <Text accessibilityRole="header" className="text-[13.5px] font-semibold text-danger">
        {t('ConfigSectionDangerZone')}
      </Text>

      <View className="mt-3 gap-2">
        <Pressable
          onPress={() => void onDownload()}
          disabled={downloading}
          accessibilityRole="button"
          accessibilityLabel={t('DownloadMyData')}
          accessibilityState={{ disabled: downloading }}
          testID="export-my-data"
          className={`w-full flex-row items-center gap-3 rounded-control border border-border p-3 active:bg-surface-2 ${
            downloading ? 'opacity-60' : ''
          }`}
        >
          <IconTile tone="accent" size={36}>
            <Download size={16} color={theme.accent} />
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-semibold text-text">{t('DownloadMyData')}</Text>
            <Text className="text-[12px] leading-snug text-text-3">{t('DownloadMyDataHint')}</Text>
          </View>
        </Pressable>

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
