import { Stack } from 'expo-router';
import { View } from 'react-native';
import AgentWidget from '../../src/ui/agent/AgentWidget';
import FeedbackLauncher from '../../src/ui/feedback/FeedbackLauncher';

// Anchor the (app) group on the dashboard so deep-linking / reloading onto a
// section screen (e.g. /goals) still has the dashboard beneath it — back returns
// there instead of failing with "GO_BACK was not handled by any navigator".
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <FeedbackLauncher />
      <AgentWidget />
    </View>
  );
}
