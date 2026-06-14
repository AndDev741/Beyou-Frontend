import { Image } from 'react-native';

export default function Logo() {
  return (
    <Image
      source={require('../assets/auth/Logo.png')}
      style={{ width: 140, height: 140, resizeMode: 'contain' }}
      accessibilityLabel="BeYou"
    />
  );
}
