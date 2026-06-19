import { View, ScrollView } from 'react-native';
import ProfileHeader from '../../src/ui/dashboard/ProfileHeader';
import Shortcuts from '../../src/ui/dashboard/Shortcuts';
import RoutineDay from '../../src/ui/dashboard/RoutineDay';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';

/**
 * Dashboard home: profile header, today's routine (the check-in loop), and
 * shortcuts. CelebrationOverlay sits above the scroll view to overlay level-up
 * and streak-milestone celebrations queued by check-ins.
 */
export default function AppHome() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 20 }}
        testID="dashboard-screen"
      >
        <ProfileHeader />
        <RoutineDay />
        <Shortcuts />
      </ScrollView>
      <CelebrationOverlay />
    </View>
  );
}
