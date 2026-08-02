import { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTutorialRegistry, type Rect } from '../../tutorial/TutorialProvider';
import type { SpotlightStep } from '../../tutorial/steps/types';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface Props {
  step: SpotlightStep; stepIndex: number; stepCount: number;
  onNext: () => void; onPrev?: () => void; onSkip: () => void;
}

const DIM = 'rgba(0,0,0,0.6)';
const PAD = 8;
// White label on the primary button — matches the config Save buttons.
const ON_PRIMARY = '#FFFFFF';

/**
 * Spotlight overlay. Rendered as an absolute-fill View (NOT a Modal) inside the
 * app's own view tree, so taps in the hole pass through to the real UI behind it
 * (`pointerEvents="box-none"` only works within one hierarchy — a Modal is a
 * separate window and would swallow those taps).
 *
 * Every rect here is WINDOW-absolute, because `measureInWindow` is. That holds
 * only while this View spans the window, so it is mounted by the (app) layout —
 * a sibling of `BottomNav`, above it — and never by a screen: a screen stops at
 * the bar's top edge, and one target (`nav-categories`) lives inside the bar.
 * Screens publish into that slot with `useSpotlightSlot`; see
 * `src/tutorial/TutorialOverlaySlot.tsx`.
 */
export default function SpotlightOverlay({ step, stepIndex, stepCount, onNext, onPrev, onSkip }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { height: H } = useWindowDimensions();
  const { measure } = useTutorialRegistry();
  // The overlay fills the (app) layout root, which starts at the physical top on
  // edge-to-edge Android, but measureInWindow reports y from below the status bar
  // — add the top inset so the hole lands on the target. Unchanged by the move out
  // of the screens: that root has the same origin the screen roots did (it is
  // their parent's parent, with no offset between them), it is just taller.
  // Null-safe (0 without a SafeArea provider, e.g. tests).
  const insets = useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;
  const [rect, setRect] = useState<Rect | null>(null);

  // Re-measure while the step is active (targets in lists move).
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await measure(step.targetId);
      if (!alive) return;
      // Skip re-render when the rect is unchanged (avoids a render loop with a
      // mock that returns a new object reference each tick).
      setRect((prev) => {
        if (!r) return prev;
        if (prev && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height) return prev;
        return r;
      });
    };
    tick();
    const id = setInterval(tick, 400);
    return () => { alive = false; clearInterval(id); };
  }, [measure, step.targetId]);

  const ry = rect ? rect.y + topInset : 0;
  const tooltipBelow = !rect || ry < H / 2;
  const holeTop = rect ? Math.max(0, ry - PAD) : 0;
  const holeBottom = rect ? ry + rect.height + PAD : 0;
  const holeLeft = rect ? Math.max(0, rect.x - PAD) : 0;
  const holeRight = rect ? rect.x + rect.width + PAD : 0;

  // Split the computed position key into two explicit style objects to satisfy TypeScript.
  const tooltipPositionStyle = tooltipBelow
    ? { top: holeBottom + 12 }
    : { bottom: H - holeTop + 12 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="spotlight-overlay">
      {/* Dimmer (4 frames around the hole). Omitted entirely until measured. */}
      {rect ? (
        <>
          <View testID="spotlight-dim-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: holeTop, backgroundColor: DIM }} />
          <View testID="spotlight-dim-bottom" style={{ position: 'absolute', top: holeBottom, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
          <View testID="spotlight-dim-left" style={{ position: 'absolute', top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop, backgroundColor: DIM }} />
          <View testID="spotlight-dim-right" style={{ position: 'absolute', top: holeTop, left: holeRight, right: 0, height: holeBottom - holeTop, backgroundColor: DIM }} />
          {/* highlight ring */}
          <View testID="spotlight-ring" pointerEvents="none" style={{ position: 'absolute', top: holeTop, left: holeLeft, width: holeRight - holeLeft, height: holeBottom - holeTop, borderWidth: 2, borderColor: theme.primary, borderRadius: 12 }} />
        </>
      ) : (
        <View testID="spotlight-dim-all" style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} pointerEvents="none" />
      )}

      {/* Tooltip card */}
      <View
        testID="spotlight-tooltip"
        style={[{ position: 'absolute', left: 12, right: 12 }, tooltipPositionStyle]}
        className="rounded-card border border-border bg-surface p-4"
      >
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-accent text-xs font-semibold">{t('TutorialStepOf', { current: stepIndex + 1, total: stepCount })}</Text>
          <Pressable onPress={onSkip} accessibilityRole="button" testID="spotlight-skip" hitSlop={8}>
            <Text className="text-text-2 text-xs font-semibold">{t('TutorialSkip')}</Text>
          </Pressable>
        </View>
        <Text className="text-text text-base font-bold">{t(step.titleKey)}</Text>
        <Text className="text-text-2 mt-1 text-sm leading-relaxed">{t(step.descKey)}</Text>

        <View className="mt-3 flex-row items-center justify-between">
          {onPrev && stepIndex > 0 ? (
            <Pressable onPress={onPrev} accessibilityRole="button" testID="spotlight-prev" className="px-3 py-2">
              <Text className="text-text font-semibold">{t('TutorialPrevious')}</Text>
            </Pressable>
          ) : <View />}
          <Pressable
            onPress={() => { if (!step.disabled) onNext(); }}
            disabled={step.disabled}
            accessibilityRole="button"
            testID="spotlight-next"
            className={`items-center rounded-control bg-accent px-5 py-2.5 ${step.disabled ? 'opacity-50' : ''}`}
          >
            <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold" numberOfLines={1}>
              {t(step.nextLabelKey ?? 'TutorialNext')}
            </Text>
          </Pressable>
        </View>
        {step.disabled && step.disabledHintKey ? (
          <Text testID="spotlight-hint" className="text-text-3 mt-2 text-xs">{t(step.disabledHintKey)}</Text>
        ) : null}
      </View>
    </View>
  );
}
