import { ScrollView } from 'react-native';
import ProfileHeader from '../../src/ui/dashboard/ProfileHeader';
import Shortcuts from '../../src/ui/dashboard/Shortcuts';
import RoutineDay from '../../src/ui/dashboard/RoutineDay';

/**
 * Dashboard home. Scaffolded in P3-T3 with Shortcuts; the ProfileHeader (P3-T4)
 * and today's RoutineDay (P3-T5) slot in above/below as those tasks land.
 * Logout moved to the configuration stub (its eventual home).
 */
export default function AppHome() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 20 }}
      testID="dashboard-screen"
    >
      <ProfileHeader />
      <RoutineDay />
      <Shortcuts />
    </ScrollView>
  );
}
