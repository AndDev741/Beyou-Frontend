import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTutorialRegistry, type Rect } from '../../tutorial/TutorialProvider';
import type { SpotlightStep } from '../../tutorial/steps/types';
import Button from '../Button';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface Props {
  step: SpotlightStep; stepIndex: number; stepCount: number;
  onNext: () => void; onPrev?: () => void; onSkip: () => void;
}

const DIM = 'rgba(0,0,0,0.6)';
const PAD = 8;

export default function SpotlightOverlay({ step, stepIndex, stepCount, onNext, onPrev, onSkip }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { width: W, height: H } = useWindowDimensions();
  const { measure } = useTutorialRegistry();
  const [rect, setRect] = useState<Rect | null>(null);

  // Re-measure while the step is active (targets in lists/modals move).
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await measure(step.targetId);
      if (!alive) return;
      // Skip re-render when the rect hasn't changed (avoids test-loop with
      // fast-resolving mocks that return a new object reference each tick).
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

  const tooltipBelow = !rect || rect.y < H / 2;
  const holeTop = rect ? Math.max(0, rect.y - PAD) : 0;
  const holeBottom = rect ? rect.y + rect.height + PAD : 0;
  const holeLeft = rect ? Math.max(0, rect.x - PAD) : 0;
  const holeRight = rect ? rect.x + rect.width + PAD : 0;

  // Split the computed position key into two explicit style objects to satisfy TypeScript.
  const tooltipPositionStyle = tooltipBelow
    ? { top: holeBottom + 12 }
    : { bottom: H - holeTop + 12 };

  // W is used implicitly through the left/right style — suppress unused-var warning.
  void W;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onSkip}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {/* Dimmer (4 frames around the hole). Omitted entirely until measured. */}
        {rect ? (
          <>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: holeTop, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', top: holeBottom, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', top: holeTop, left: holeRight, right: 0, height: holeBottom - holeTop, backgroundColor: DIM }} />
            {/* highlight ring */}
            <View pointerEvents="none" style={{ position: 'absolute', top: holeTop, left: holeLeft, width: holeRight - holeLeft, height: holeBottom - holeTop, borderWidth: 2, borderColor: theme.primary, borderRadius: 12 }} />
          </>
        ) : (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} pointerEvents="none" />
        )}

        {/* Tooltip card */}
        <View
          style={[{ position: 'absolute', left: 12, right: 12 }, tooltipPositionStyle]}
          className="rounded-2xl border border-primary/30 bg-background p-4"
        >
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-primary text-xs font-semibold">{t('TutorialStepOf', { current: stepIndex + 1, total: stepCount })}</Text>
            <Pressable onPress={onSkip} accessibilityRole="button" testID="spotlight-skip" hitSlop={8}>
              <Text className="text-description text-xs font-semibold">{t('TutorialSkip')}</Text>
            </Pressable>
          </View>
          <Text className="text-secondary text-base font-bold">{t(step.titleKey)}</Text>
          <Text className="text-description mt-1 text-sm leading-relaxed">{t(step.descKey)}</Text>

          <View className="mt-3 flex-row items-center justify-between">
            {onPrev && stepIndex > 0 ? (
              <Pressable onPress={onPrev} accessibilityRole="button" testID="spotlight-prev" className="px-3 py-2">
                <Text className="text-secondary font-semibold">{t('TutorialPrevious')}</Text>
              </Pressable>
            ) : <View />}
            <Button
              text={t(step.nextLabelKey ?? 'TutorialNext')}
              mode="create"
              size="small"
              disabled={step.disabled}
              onPress={() => { if (!step.disabled) onNext(); }}
              testID="spotlight-next"
            />
          </View>
          {step.disabled && step.disabledHintKey ? (
            <Text testID="spotlight-hint" className="text-placeholder mt-2 text-xs">{t(step.disabledHintKey)}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
