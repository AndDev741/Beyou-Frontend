import { Stack } from 'expo-router';
import { View } from 'react-native';
import { TutorialOverlayHost } from '../../src/tutorial/TutorialOverlaySlot';
import AgentWidget from '../../src/ui/agent/AgentWidget';
import BottomNav from '../../src/ui/dashboard/BottomNav';

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
        {/* Sem balão flutuante: a barra acima já carrega o botão central do
            assistente, e ela existe em TODA tela deste grupo. Dois gatilhos
            para o mesmo painel seriam mobília permanente numa tela pequena —
            o widget continua montado aqui porque é ele que guarda a conversa. */}
        <AgentWidget showFab={false} />
      </TutorialOverlayHost>
    </View>
  );
}
