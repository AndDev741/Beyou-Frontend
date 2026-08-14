import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import Input from '../Input';

interface GoalProgressModalProps {
  visible: boolean;
  /** The goal's name, shown under the title. */
  name: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  onClose: () => void;
  /** Runs the request; the modal closes once it settles. */
  onApply: (amount: number, direction: 'increase' | 'decrease') => Promise<void>;
  testID?: string;
}

/** The jumps worth one tap. Anything else goes in the field. */
const QUICK_AMOUNTS = [1, 5, 10];

/**
 * Progress by an amount the user chooses — mirror of the web's `GoalProgressModal`.
 *
 * The card's +/- stay as the one-at-a-time path; this is for the day someone read
 * forty pages and does not want to press plus forty times.
 */
export default function GoalProgressModal({
  visible,
  name,
  currentValue,
  targetValue,
  unit,
  onClose,
  onApply,
  testID = 'goal-progress-modal',
}: GoalProgressModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('1');
  const [pending, setPending] = useState(false);

  // Every opening starts from 1, so a big jump typed once does not come back as
  // the default on the next goal.
  useEffect(() => {
    if (visible) {
      setAmount('1');
      setPending(false);
    }
  }, [visible]);

  // The `!visible` null-gate is what keeps RN's Modal out of the tree in tests.
  if (!visible) return null;

  const parsed = Number(amount.replace(',', '.'));
  const isValid = Number.isFinite(parsed) && parsed > 0;

  const apply = async (direction: 'increase' | 'decrease') => {
    if (!isValid || pending) return;
    setPending(true);
    try {
      await onApply(parsed, direction);
      onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Cancel')}
          onPress={onClose}
          testID={`${testID}-backdrop`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="w-full max-w-[420px] rounded-card border border-border bg-surface p-5" testID={testID}>
          <Text accessibilityRole="header" className="text-[15px] font-semibold tracking-[-0.01em] text-text">
            {t('UpdateProgress')}
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-snug text-text-2">{name}</Text>
          <Text className="mt-0.5 font-mono text-[12.5px] text-text-3">
            {`${currentValue}/${targetValue} ${unit ?? ''}`}
          </Text>

          <View className="mt-4 flex-row items-end gap-2">
            <View className="w-24 shrink-0">
              <Input
                label={t('Amount')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                compact
                accessibilityLabel={t('Amount')}
                testID={`${testID}-amount`}
              />
            </View>
            <View className="min-w-0 flex-1 flex-row flex-wrap gap-2">
              {QUICK_AMOUNTS.map((quick) => {
                const isOn = parsed === quick;
                return (
                  <Pressable
                    key={quick}
                    onPress={() => setAmount(String(quick))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                    testID={`${testID}-quick-${quick}`}
                    className={`rounded-control border px-3 py-2 ${
                      isOn ? 'border-accent bg-accent-soft' : 'border-border'
                    }`}
                  >
                    <Text
                      className={`font-mono-semibold text-xs ${isOn ? 'text-accent' : 'text-text-3'}`}
                    >
                      {`+${quick}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-4 flex-row justify-end gap-2">
            <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} testID={`${testID}-cancel`} />
            <Button
              text={t('Remove')}
              mode="ghost"
              size="auto"
              disabled={!isValid || pending || currentValue === 0}
              onPress={() => void apply('decrease')}
              testID={`${testID}-remove`}
            />
            <Button
              text={t('Add')}
              mode="primary"
              size="auto"
              submitting={pending}
              disabled={!isValid || pending}
              onPress={() => void apply('increase')}
              testID={`${testID}-add`}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
