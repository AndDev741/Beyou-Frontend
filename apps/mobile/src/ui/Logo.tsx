import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function Logo() {
  const { t } = useTranslation();
  return (
    <Image
      source={require('../assets/auth/Logo.png')}
      style={{ width: 140, height: 140, resizeMode: 'contain' }}
      accessibilityRole="image"
      accessibilityLabel={t('LogoAlt')}
    />
  );
}
