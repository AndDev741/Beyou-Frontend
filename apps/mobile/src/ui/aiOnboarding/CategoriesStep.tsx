import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CATEGORIES } from '@beyou/state/onboarding/defaultCategories';
import BeyouIcon from '../BeyouIcon';
import Input from '../Input';
import Button from '../Button';
import { useBeyouTheme } from '../../theme/ThemeProvider';

const ON_PRIMARY = '#FFFFFF';

interface CategoriesStepProps {
  onContinue: (names: string[]) => void;
  loading: boolean;
}

type Chip = { name: string; iconId?: string };

/**
 * First wizard step: pick life areas from the 18 default chips or add custom
 * ones (custom entries are auto-selected, deduped case-insensitively against
 * every existing chip). Mirrors the web CategoriesStep.
 */
export default function CategoriesStep({ onContinue, loading }: CategoriesStepProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  const chips: Chip[] = useMemo(
    () => [
      ...DEFAULT_CATEGORIES.map((c) => ({ name: t(c.nameKey), iconId: c.iconId })),
      ...customChips.map((name) => ({ name })),
    ],
    [t, customChips]
  );

  const isSelected = (name: string) => selected.includes(name);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const addCustom = () => {
    const value = customInput.trim();
    if (!value) return;
    const exists = [...chips.map((c) => c.name), ...selected].some(
      (n) => n.toLowerCase() === value.toLowerCase()
    );
    if (!exists) {
      setCustomChips((prev) => [...prev, value]);
      setSelected((prev) => [...prev, value]);
    }
    setCustomInput('');
  };

  return (
    <View className="w-full items-center gap-6">
      <View className="items-center gap-2 px-2">
        <Text className="text-secondary text-center text-2xl font-bold">
          {t('AiOnboardingCategoriesQuestion')}
        </Text>
        <Text className="text-description text-center text-base">
          {t('AiOnboardingCategoriesHint')}
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-center gap-2">
        {chips.map((chip) => {
          const active = isSelected(chip.name);
          return (
            <Pressable
              key={chip.name}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggle(chip.name)}
              className={`flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${
                active ? 'border-primary bg-primary' : 'border-primary/20 bg-primary/10'
              }`}
            >
              {chip.iconId ? (
                <BeyouIcon
                  id={chip.iconId}
                  size={16}
                  color={active ? ON_PRIMARY : theme.primary}
                />
              ) : null}
              <Text
                className="text-sm font-medium"
                style={{ color: active ? ON_PRIMARY : theme.secondary }}
              >
                {chip.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="w-full gap-4">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1">
            <Input
              value={customInput}
              onChangeText={setCustomInput}
              placeholder={t('AiOnboardingCategoriesPlaceholder')}
              accessibilityLabel={t('AiOnboardingCategoriesPlaceholder')}
              testID="ai-onboarding-custom-input"
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
          </View>
          <Button
            text={t('AiOnboardingAdd')}
            mode="default"
            size="small"
            onPress={addCustom}
            testID="ai-onboarding-add"
          />
        </View>

        <View className="items-center">
          <Button
            text={t('AiOnboardingContinue')}
            mode="create"
            disabled={selected.length === 0}
            submitting={loading}
            onPress={() => onContinue(selected)}
            testID="ai-onboarding-continue"
          />
        </View>
      </View>
    </View>
  );
}
