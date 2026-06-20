import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useDashboardData } from '../../src/dashboard/useDashboardData';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import ProfileHeader from '../../src/ui/dashboard/ProfileHeader';
import Shortcuts from '../../src/ui/dashboard/Shortcuts';
import RoutineDay from '../../src/ui/dashboard/RoutineDay';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';

/**
 * Dashboard home: loads profile + today's routine + lists on mount
 * (useDashboardData), then renders the profile header, today's routine (the
 * check-in loop), and shortcuts. CelebrationOverlay overlays level-up / streak
 * celebrations queued by check-ins.
 */
export default function AppHome() {
  const { loading } = useDashboardData();
  const { theme } = useBeyouTheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID="dashboard-loading">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

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
