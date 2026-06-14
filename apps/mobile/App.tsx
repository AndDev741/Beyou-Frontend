import { Text, View } from 'react-native';
import { defaultLight } from '@beyou/theme';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: defaultLight.background }}>
      <Text style={{ color: defaultLight.primary, fontSize: 20 }}>BeYou Mobile — {defaultLight.mode}</Text>
    </View>
  );
}
