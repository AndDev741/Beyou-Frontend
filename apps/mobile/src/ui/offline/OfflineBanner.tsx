import { View, Text, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { dismissBanner } from '../../offline/connectivitySlice';
import type { RootState, AppDispatch } from '../../store';

/**
 * Offline-mode explainer. Episode semantics live in the connectivity slice:
 * dismissing hides it until the device goes offline AGAIN after being online.
 */
export default function OfflineBanner() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { isOnline, bannerDismissed, pendingOps } = useSelector(
    (s: RootState) => s.connectivity
  );

  if (isOnline !== false || bannerDismissed) return null;

  return (
    <View testID="offline-banner" className="bg-secondary border-b border-primary px-4 py-3">
      <Text className="text-primary font-bold">{t('OfflineBannerTitle')}</Text>
      <Text className="text-description mt-1">{t('OfflineBannerBody')}</Text>
      {pendingOps > 0 ? (
        <Text className="text-description mt-1">
          {t('OfflineBannerPending', { count: pendingOps })}
        </Text>
      ) : null}
      <Pressable
        testID="offline-banner-close"
        accessibilityRole="button"
        onPress={() => dispatch(dismissBanner())}
        className="self-end mt-2 px-4 py-2 rounded-lg bg-primary"
      >
        <Text className="text-white font-semibold">{t('OfflineBannerClose')}</Text>
      </Pressable>
    </View>
  );
}
