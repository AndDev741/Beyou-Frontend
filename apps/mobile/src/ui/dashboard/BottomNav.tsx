import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useRouter, usePathname } from 'expo-router';
import {
  CalendarDays,
  Ellipsis,
  Folder,
  House,
  ListChecks,
  MessageSquare,
  Repeat,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useTutorialTarget } from '../../tutorial/useTutorialTarget';
import { openAgentPanel } from '../agent/agentPanelBus';
import IconTile from '../IconTile';
import type { RootState } from '../../store';

type NavItemConfig = { key: string; route: string; Icon: LucideIcon; targetId?: string };

// Five targets, as in the mockup: Today, Routines, [Assistant], Habits, More.
// The assistant sits in the middle because it became the ONLY way into the agent
// on mobile (the floating bubble is gone) and it exists on every signed-in
// screen.
const LEFT: NavItemConfig[] = [
  { key: 'NavDashboard', route: '/', Icon: House },
  { key: 'Routines', route: '/routines', Icon: CalendarDays, targetId: 'nav-routines' },
];
const RIGHT: NavItemConfig[] = [
  { key: 'Habits', route: '/habits', Icon: Repeat, targetId: 'nav-habits' },
];

// What left the bar is still one tap away, inside the sheet — with the SAME
// i18n keys as before, which is how the tests (and the user) find these
// destinations. There is no Profile route on mobile: the profile lives in
// Configuration.
const SHEET: NavItemConfig[] = [
  { key: 'Tasks', route: '/tasks', Icon: ListChecks, targetId: 'nav-tasks' },
  { key: 'Goals', route: '/goals', Icon: Trophy, targetId: 'nav-goals' },
  { key: 'Categories', route: '/categories', Icon: Folder },
  { key: 'Config', route: '/configuration', Icon: Settings, targetId: 'nav-config' },
  { key: 'FeedbackShortcutLabel', route: '/feedback', Icon: MessageSquare, targetId: 'nav-feedback' },
];

// A nested route (say /routines/123) still lights its section. The separator
// keeps /goals from matching /goals-archive — and keeps '/' (Today) exact, since
// every path starts with a slash.
const isRouteActive = (pathname: string, route: string): boolean =>
  pathname === route || pathname.startsWith(`${route}/`);

/**
 * Extracted so each item can call `useTutorialTarget` conditionally without
 * breaking the Rules of Hooks (never a hook inside `.map()`).
 */
function NavItemButton({
  item,
  theme,
  active,
}: {
  item: NavItemConfig;
  theme: ReturnType<typeof useBeyouTheme>['theme'];
  active: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const ref = useTutorialTarget(item.targetId ?? '');
  const { Icon } = item;
  const color = active ? theme.accent : theme.text3;

  return (
    <Pressable
      ref={item.targetId ? ref : undefined}
      onPress={() => router.push(item.route)}
      accessibilityRole="button"
      accessibilityLabel={t(item.key)}
      accessibilityState={{ selected: active }}
      testID={`nav-${item.key.toLowerCase()}`}
      className="flex-1 items-center justify-center gap-0.5 rounded-control py-1.5 active:bg-surface-2"
    >
      {/* Fixed size: growing the active icon would resize two items on every
          navegação e empurraria os vizinhos — muito visível a 360px. A cor é
          quem responde "onde estou". */}
      <Icon size={20} color={color} />
      <Text className="text-[10px] font-semibold" style={{ color }} numberOfLines={1}>
        {t(item.key)}
      </Text>
    </Pressable>
  );
}

/** A destination in the "More" sheet: tile, label and the tutorial target. */
function SheetTile({
  item,
  theme,
  onPress,
}: {
  item: NavItemConfig;
  theme: ReturnType<typeof useBeyouTheme>['theme'];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const ref = useTutorialTarget(item.targetId ?? '');
  const { Icon } = item;

  return (
    <Pressable
      ref={item.targetId ? ref : undefined}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(item.key)}
      testID={`nav-${item.key.toLowerCase()}`}
      className="w-[31%] items-center gap-2 rounded-card border border-border bg-surface px-2 py-4 active:bg-surface-2"
    >
      <IconTile tone="accent" size={36}>
        <Icon size={17} color={theme.accent} />
      </IconTile>
      <Text className="text-center text-[11px] font-semibold text-text-2" numberOfLines={2}>
        {t(item.key)}
      </Text>
    </Pressable>
  );
}

export default function BottomNav() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // One hook here instead of one per item — the pathname is the same for all.
  const pathname = usePathname() ?? '';
  const [sheetOpen, setSheetOpen] = useState(false);
  // Same gate as AgentWidget: during onboarding the spotlight owns the screen,
  // and a button that opens nothing would be noise.
  const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);

  // "More" lights up when the sheet is open OR when the current screen lives in
  // it — otherwise the bar went mute on /tasks, /goals, /categories and
  // /configuration.
  const moreActive = sheetOpen || SHEET.some((item) => isRouteActive(pathname, item.route));

  const goTo = (route: string) => {
    setSheetOpen(false);
    router.push(route);
  };

  // `nav-categories` is the target of dashboard tutorial step 2. Categories now
  // lives behind "More", so the target follows the PATH to it: this button is
  // what the spotlight has to light up, and it is always mounted (a target
  // inside the closed sheet would have no rect to measure).
  const moreRef = useTutorialTarget('nav-categories');

  return (
    <>
      {/* The scrim sits BELOW the bar: opening "More" must not black out the
          atalhos, que são a orientação de onde se está. Sem Modal de propósito
          — um Modal é outra janela e cobriria a barra junto. */}
      {sheetOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
          testID="nav-more-backdrop"
          onPress={() => setSheetOpen(false)}
          style={StyleSheet.absoluteFill}
          className="bg-black/40"
        />
      ) : null}

      <View>
        {sheetOpen ? (
          <View
            testID="nav-more-sheet"
            className="mx-2 mb-2 rounded-frame border border-border bg-surface p-4"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              elevation: 12,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: -6 },
            }}
          >
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <Text accessibilityRole="header" className="mb-3 text-[15px] font-semibold text-text">
              {t('More')}
            </Text>
            {/* 31% + an 8px gap = three per row at any phone width;
                a segunda linha alinha à esquerda em vez de esticar os dois
                últimos tiles. */}
            <View className="flex-row flex-wrap gap-2">
              {SHEET.map((item) => (
                <SheetTile key={item.key} item={item} theme={theme} onPress={() => goTo(item.route)} />
              ))}
            </View>
          </View>
        ) : null}

        <View
          testID="bottom-nav"
          accessibilityLabel={t('Shortcuts')}
          className="flex-row items-center justify-around border-t border-border bg-surface px-2 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          {LEFT.map((item) => (
            <NavItemButton
              key={item.key}
              item={item}
              theme={theme}
              active={isRouteActive(pathname, item.route)}
            />
          ))}

          {/* Slot for the centre disc. It is absolutely positioned (below) so
              subir uma altura EXATA para fora da barra; um filho em fluxo teria
              essa altura decidida pela altura dos rótulos, que muda com a fonte
              do sistema. O espaçador é quem reserva o buraco no meio da linha. */}
          <View className="w-14 shrink-0" />

          {RIGHT.map((item) => (
            <NavItemButton
              key={item.key}
              item={item}
              theme={theme}
              active={isRouteActive(pathname, item.route)}
            />
          ))}

          <Pressable
            ref={moreRef}
            onPress={() => setSheetOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={t('More')}
            accessibilityState={{ selected: moreActive, expanded: sheetOpen }}
            testID="nav-more"
            className="flex-1 items-center justify-center gap-0.5 rounded-control py-1.5 active:bg-surface-2"
          >
            <Ellipsis size={20} color={moreActive ? theme.accent : theme.text3} />
            <Text
              className="text-[10px] font-semibold"
              style={{ color: moreActive ? theme.accent : theme.text3 }}
              numberOfLines={1}
            >
              {t('More')}
            </Text>
          </Pressable>

          {isTutorialCompleted ? (
            /* A full-width strip centres the disc with flexbox. Before
               era `left: '50%'` + `marginLeft`, e a porcentagem resolvia contra
               a caixa de conteúdo (a barra tem px-2), então o disco caía 10dp à
               esquerda do meio da tela. `box-none` deixa o toque passar pela
               faixa e chegar aos atalhos por baixo. */
            <View
              pointerEvents="box-none"
              style={{ position: 'absolute', left: 0, right: 0, top: -12, alignItems: 'center' }}
            >
              {/* Halo: two translucent discs instead of a blur (RN has no
                  filtro). É o único alvo da barra que não é navegação, e o
                  desenho precisa dizer isso antes do rótulo. */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -6,
                  height: 68,
                  width: 68,
                  borderRadius: 34,
                  backgroundColor: theme.accent,
                  opacity: 0.06,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -2,
                  height: 60,
                  width: 60,
                  borderRadius: 30,
                  backgroundColor: theme.accent,
                  opacity: 0.1,
                }}
              />
              <Pressable
                onPress={openAgentPanel}
                accessibilityRole="button"
                accessibilityLabel={t('OpenAssistant')}
                testID="nav-agent"
                className="h-14 w-14 items-center justify-center rounded-full bg-accent active:opacity-80"
                style={{
                  elevation: 8,
                  shadowColor: theme.accent,
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <Sparkles size={22} color={theme.onAccent} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}
