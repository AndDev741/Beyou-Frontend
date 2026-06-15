import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function MobileBrand() {
  const { t } = useTranslation();
  return (
    <View className="items-center pt-6 pb-2" testID="mobile-brand">
      <Image
        source={require('../assets/auth/Logo.png')}
        style={{ width: 90, height: 90, resizeMode: 'contain' }}
        accessibilityRole="image"
        accessibilityLabel={t('LogoAlt')}
      />
      {/* `BeYou` i18n value carries a leading "\n" the web heading renders via
          `whitespace-pre-line`; HTML collapses it in the web wordmark, so we trim
          here to match — RN <Text> would otherwise show a blank line above it. */}
      <Text className="text-3xl font-bold text-primary mt-1">{t('BeYou').trim()}</Text>
      <Text className="text-sm text-description mt-1">{t('YourFavoriteHT')}</Text>
    </View>
  );
}
