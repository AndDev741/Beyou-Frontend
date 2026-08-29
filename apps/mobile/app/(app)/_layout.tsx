import { Stack } from 'expo-router';
import { View } from 'react-native';
import { TutorialOverlayHost } from '../../src/tutorial/TutorialOverlaySlot';
import AgentWidget from '../../src/ui/agent/AgentWidget';
import BottomNav from '../../src/ui/dashboard/BottomNav';
import RunningTimerHub from '../../src/focus/RunningTimerHub';

// Anchor the (app) group on the dashboard so deep-linking / reloading onto a
// section screen (e.g. /goals) still has the dashboard beneath it — back returns
// there instead of failing with "GO_BACK was not handled by any navigator".
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* The tutorial spotlight is hosted here, not inside the screens: its
          target rects come from `measureInWindow`, so it is only correct while
          it spans the window — which a screen stopped doing once the bar became
          its sibling below. The host renders the overlay after everything else
          in this column, so the bar is dimmed and the ring draws over it. Each
          screen still owns its own tutorial hook and publishes into the slot
          with `useSpotlightSlot`. */}
      <TutorialOverlayHost>
        {/* Screens take every pixel the bar leaves. That split is the whole
            clearance story on native: BottomNav is a SIBLING in this column, not
            an overlay, so content is laid out above it and no screen needs a
            spacer of its own. (The web app can't do this — its bar is `fixed` —
            so it mounts an explicit spacer next to the bar instead.) */}
        <View style={{ flex: 1 }} testID="app-screen-area">
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        {/* Mounted here rather than on the dashboard so every authenticated
            screen can move sideways in one tap, instead of routing back through
            the dashboard first. */}
        <BottomNav />
        {/* No floating bubble: the bar above already carries the assistant's centre
            button, and it exists on EVERY screen in this group. Two triggers for the
            same panel would be permanent furniture on a small screen — the widget
            stays mounted here because it is what holds the conversation. */}
        <AgentWidget showFab={false} />
        {/* Rides every screen in this group. Renders nothing unless a focus cycle is live, and the
            focus screen itself lives outside the group so it never competes with the real panel. */}
        <RunningTimerHub />
      </TutorialOverlayHost>
    </View>
  );
}
