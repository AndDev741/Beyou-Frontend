import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
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
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useTutorialTarget } from '../../tutorial/useTutorialTarget';
import { openAgentPanel } from '../agent/agentPanelBus';
import BottomSheet from '../BottomSheet';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import type { RootState } from '../../store';

type NavItemConfig = { key: string; route: string; Icon: LucideIcon; targetId?: string };

// Cinco alvos, como no mockup: Hoje, Rotinas, [Assistente], Hábitos e Mais.
// O assistente fica no centro porque passou a ser o ÚNICO acesso ao agente no
// mobile (o balão flutuante saiu) e ele existe em toda tela autenticada.
const LEFT: NavItemConfig[] = [
  { key: 'Today', route: '/', Icon: House },
  { key: 'Routines', route: '/routines', Icon: CalendarDays, targetId: 'nav-routines' },
];
const RIGHT: NavItemConfig[] = [
  { key: 'Habits', route: '/habits', Icon: Repeat, targetId: 'nav-habits' },
];

// Quem saiu da barra continua a um toque, dentro da sheet — com as MESMAS
// chaves de i18n de antes, que é como os testes (e o usuário) encontram estes
// destinos. Não há rota de Perfil no mobile: o perfil vive em Configuração.
const SHEET: NavItemConfig[] = [
  { key: 'Tasks', route: '/tasks', Icon: ListChecks, targetId: 'nav-tasks' },
  { key: 'Goals', route: '/goals', Icon: Trophy, targetId: 'nav-goals' },
  { key: 'Categories', route: '/categories', Icon: Folder },
  { key: 'Config', route: '/configuration', Icon: Settings, targetId: 'nav-config' },
  { key: 'FeedbackShortcutLabel', route: '/feedback', Icon: MessageSquare, targetId: 'nav-feedback' },
];

// Uma rota aninhada (ex.: /routines/123) ainda acende a sua seção. O separador
// impede que /goals case com /goals-archive — e mantém '/' (Hoje) exato, já que
// todo caminho começa com barra.
const isRouteActive = (pathname: string, route: string): boolean =>
  pathname === route || pathname.startsWith(`${route}/`);

/**
 * Componente extraído para que cada item possa chamar `useTutorialTarget`
 * condicionalmente sem violar as Rules of Hooks (hook dentro de `.map()` não).
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
      {/* Tamanho fixo: crescer o ícone ativo redimensionaria dois itens a cada
          navegação e empurraria os vizinhos — muito visível a 360px. A cor é
          quem responde "onde estou". */}
      <Icon size={20} color={color} />
      <Text className="text-[10px] font-semibold" style={{ color }} numberOfLines={1}>
        {t(item.key)}
      </Text>
    </Pressable>
  );
}

/** Um destino da sheet "Mais": tile com ícone, rótulo e o alvo de tutorial. */
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
      <IconTile tone="neutral" size={36}>
        <Icon size={18} color={theme.text2} />
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
  // Um hook aqui em vez de um por item — o pathname é o mesmo para todos.
  const pathname = usePathname() ?? '';
  const [sheetOpen, setSheetOpen] = useState(false);
  // Mesmo portão do AgentWidget: durante o onboarding o
  // spotlight é dono da tela, e um botão que não abre nada seria só ruído.
  const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);

  // "Mais" acende quando a sheet está aberta OU quando a tela atual mora nela —
  // senão a barra ficaria muda em /tasks, /goals, /categories e /configuration.
  const moreActive = sheetOpen || SHEET.some((item) => isRouteActive(pathname, item.route));

  const goTo = (route: string) => {
    setSheetOpen(false);
    router.push(route);
  };

  // `nav-categories` é o alvo do passo 2 do tutorial do dashboard. Categorias
  // agora mora atrás de "Mais", então o alvo acompanha o CAMINHO até ela: é
  // este botão que o spotlight precisa iluminar, e ele está sempre montado
  // (um alvo dentro da sheet fechada não teria retângulo para medir).
  const moreRef = useTutorialTarget('nav-categories');

  return (
    <>
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

        {/* Vaga do disco central. Ele é posicionado em absoluto (abaixo) para
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
          onPress={() => setSheetOpen(true)}
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
          <Pressable
            onPress={openAgentPanel}
            accessibilityRole="button"
            accessibilityLabel={t('OpenAssistant')}
            testID="nav-agent"
            className="absolute h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-80"
            style={{
              // Centralizado sobre o espaçador (dois itens flexíveis de cada
              // lado ⇒ o meio da barra é o meio da vaga) e 14px para fora da
              // barra: alto o bastante para ler como disco elevado, baixo o
              // bastante para o toque não depender da área fora do pai.
              left: '50%',
              marginLeft: -24,
              top: -14,
              elevation: 6,
              shadowColor: theme.accent,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <Sparkles size={22} color={theme.onAccent} />
          </Pressable>
        ) : null}
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        closeLabel="Close"
        maxHeight="max-h-[70%]"
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text accessibilityRole="header" className="text-base font-semibold text-text">
            {t('More')}
          </Text>
          <IconButton label={t('Close')} onPress={() => setSheetOpen(false)} testID="nav-more-close">
            <X size={18} color={theme.text3} />
          </IconButton>
        </View>
        <ScrollView>
          {/* 31% + gap de 8px = três por linha em qualquer largura de celular;
              a segunda linha alinha à esquerda em vez de esticar os dois
              últimos tiles. */}
          <View className="flex-row flex-wrap gap-2">
            {SHEET.map((item) => (
              <SheetTile key={item.key} item={item} theme={theme} onPress={() => goTo(item.route)} />
            ))}
          </View>
        </ScrollView>
      </BottomSheet>
    </>
  );
}
