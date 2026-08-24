import type { ReactNode } from 'react';
import { useContext, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Toast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

/** Extras that `notify` packs into `props`. */
export type BeyouToastProps = {
  /** The entity's icon — the habit checked, the goal completed. */
  icon?: ReactNode;
  /** How long the time bar takes to empty. */
  duration?: number;
};

export const TOAST_DURATION_MS = 4000;

/**
 * The mockup's timer: 2px, no track underneath. Reanimated because the width
 * animates on the UI thread — a toast shows up during a navigation or a fetch,
 * and a JS-driven animation would stutter exactly then.
 */
function ToastTimer({ color, duration }: { color: string; duration: number }) {
  const progress = useSharedValue(1);
  const reduce = useReducedMotion();

  useEffect(() => {
    progress.value = 1;
    if (!reduce) progress.value = withTiming(0, { duration });
  }, [duration, progress, reduce]);

  const style = useAnimatedStyle(() => ({ flex: progress.value }));

  if (reduce) return null;

  return (
    <View className="mt-2.5 h-0.5 flex-row" testID="toast-timer">
      <Animated.View style={[style, { backgroundColor: color, borderRadius: 1 }]} />
      <View className="flex-[0.0001]" />
    </View>
  );
}

function toneColor(tone: ToastTone, theme: ReturnType<typeof useBeyouTheme>['theme']): string {
  if (tone === 'success') return theme.success;
  if (tone === 'error') return theme.danger;
  if (tone === 'warning') return theme.flame;
  return theme.accent;
}

function ToneIcon({ tone, color }: { tone: ToastTone; color: string }) {
  if (tone === 'success') return <Check size={16} color={color} />;
  if (tone === 'error') return <CircleAlert size={16} color={color} />;
  if (tone === 'warning') return <TriangleAlert size={16} color={color} />;
  return <Info size={16} color={color} />;
}

/**
 * The mockup's NOTIFY: left border in the tone, the entity's icon, a title and an
 * optional subtitle. Mirrors `apps/web/src/lib/notify.tsx` — including the rule
 * that the body stays on the theme surface and only the left bar and the icon
 * carry the colour.
 */
function BeyouToast({ tone, params }: { tone: ToastTone; params: ToastConfigParams<BeyouToastProps> }) {
  const { theme } = useBeyouTheme();
  const { text1, text2, props } = params;
  const color = toneColor(tone, theme);
  const duration = props?.duration ?? TOAST_DURATION_MS;

  return (
    <View
      testID={`toast-${tone}`}
      className="w-[92%] rounded-[14px] border border-border bg-surface px-3 py-3"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <View className="flex-row items-start gap-2.5">
        <View
          className="h-8 w-8 shrink-0 items-center justify-center rounded-control"
          style={{ backgroundColor: withAlpha(color, 0.12) }}
        >
          {props?.icon ?? <ToneIcon tone={tone} color={color} />}
        </View>

        <View className="min-w-0 flex-1">
          <Text testID="toast-title" className="text-[13px] font-semibold text-text">
            {text1}
          </Text>
          {text2 ? (
            <Text testID="toast-subtitle" className="mt-0.5 text-[12px] text-text-3">
              {text2}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => Toast.hide()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="toast-close"
          className="rounded-md p-1 active:bg-surface-2"
        >
          <X size={14} color={theme.text3} />
        </Pressable>
      </View>

      <ToastTimer color={color} duration={duration} />
    </View>
  );
}

/** Passed to `<Toast />` in the root layout: every notification uses this shell. */
export const toastConfig: ToastConfig = {
  success: (params) => <BeyouToast tone="success" params={params as ToastConfigParams<BeyouToastProps>} />,
  error: (params) => <BeyouToast tone="error" params={params as ToastConfigParams<BeyouToastProps>} />,
  info: (params) => <BeyouToast tone="info" params={params as ToastConfigParams<BeyouToastProps>} />,
  warning: (params) => <BeyouToast tone="warning" params={params as ToastConfigParams<BeyouToastProps>} />,
};

/** The toast currently on screen, kept so a closing modal can hand it back. */
type LiveToast = {
  params: Parameters<typeof Toast.show>[0];
  /** Wall-clock instant the toast is due to disappear on its own. */
  expiresAt: number;
};

let live: LiveToast | null = null;

/** Called by `notify` on every show, so a modal teardown knows what to replay. */
export function rememberToast(params: Parameters<typeof Toast.show>[0], ttl: number) {
  live = { params, expiresAt: Date.now() + ttl };
}

/** Called from the toast's own `onHide`, so a finished toast is never replayed. */
export function forgetToast() {
  live = null;
}

/**
 * Hands a still-running toast to whichever host is active NOW.
 *
 * A toast raised from inside a modal renders in THAT modal's window, so closing
 * the modal would take a toast that still had seconds left to run with it. This
 * is not a hypothetical: it is the shape of nearly every success path in the
 * app, which notifies and then closes in the same handler.
 *
 * The replay carries the REMAINING time, so a toast does not restart its four
 * seconds each time a modal closes underneath it.
 */
function replayActiveToast() {
  if (!live) return;
  const remaining = live.expiresAt - Date.now();
  if (remaining <= 0) {
    live = null;
    return;
  }
  Toast.show({
    ...live.params,
    visibilityTime: remaining,
    props: { ...(live.params.props ?? {}), duration: remaining },
    onHide: forgetToast,
  });
}

/**
 * The host that goes in the root layout. It has to be its own component to read
 * the top inset from INSIDE the SafeAreaProvider — whoever renders the provider
 * cannot see its own context.
 */
export function BeyouToastHost() {
  const insets = useContext(SafeAreaInsetsContext);
  return <Toast config={toastConfig} topOffset={(insets?.top ?? 0) + 8} />;
}

/**
 * DO NOT REMOVE THIS FROM A MODAL. It is not a duplicate of `BeyouToastHost`.
 *
 * React Native's `Modal` is not an overlay inside our view tree: on Android it
 * opens a native Dialog with its own Window, on iOS it presents a separate view
 * controller. Either way it sits ABOVE the whole root view at the OS level, so
 * the root layout's toast host physically cannot paint over it. `zIndex` and
 * `elevation` do nothing here — they only order siblings within one window.
 *
 * Without a host inside the modal, every toast raised while a modal is open is
 * invisible. The failure is asymmetric and that is why it went unnoticed for so
 * long: the success paths call `onClose()` right after notifying, so the modal
 * tears down and the toast surfaces; the error paths `return` early and keep the
 * modal open, so only errors visibly vanish.
 *
 * `react-native-toast-message` supports this directly — it keeps a STACK of refs
 * and `Toast.show` resolves to the last one mounted (see `getRef` in the
 * library's `Toast.js`). Mounting this inside a modal makes it win while the
 * modal is up; unmounting hands control back to the root host with no bookkeeping
 * on our side. RN unmounts modal children when `visible` is false, so the
 * register/unregister tracks visibility exactly. Nesting is fine too: the
 * innermost modal is the last to mount, so it wins.
 */
export function ModalToastHost() {
  // The replay runs on a macrotask, not inline in the cleanup: the ref detach
  // that removes THIS host from the library's stack happens during the same
  // commit, and depending on it having already run would be depending on
  // React's internal teardown order. A tick later the stack is settled and
  // `Toast.show` resolves to the host below. The gap is one frame, invisible
  // mid-toast.
  useEffect(() => () => {
    setTimeout(replayActiveToast, 0);
  }, []);

  return <BeyouToastHost />;
}
