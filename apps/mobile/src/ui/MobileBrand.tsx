import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function MobileBrand() {
  const { t } = useTranslation();
  return (
    <View className="items-center pt-6 pb-2" testID="mobile-brand">
      <Image
        source={require('../assets/auth/Logo.png')}
        style={{ width: 90, height: 90, resizeMode: 'contain' }}
        accessibilityLabel={t('LogoAlt')}
      />
      <Text className="text-3xl font-bold text-primary mt-1">{t('BeYou')}</Text>
      <Text className="text-sm text-description mt-1">{t('YourFavoriteHT')}</Text>
    </View>
  );
}
