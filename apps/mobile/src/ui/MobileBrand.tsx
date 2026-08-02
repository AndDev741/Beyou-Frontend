import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import BrandMark from './BrandMark';

export default function MobileBrand() {
  const { t } = useTranslation();
  return (
    <View className="items-center pt-6 pb-2" testID="mobile-brand">
      <BrandMark size={44} withWordmark />
      <Text className="text-sm text-text-2 mt-2">{t('YourFavoriteHT')}</Text>
    </View>
  );
}
