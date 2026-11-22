import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Input from '../ui/Input';

type LineFormProps = {
  initial: string;
  label: string;
  /** The server's cap: 200 for a profile line, 500 for a note. */
  maxLength: number;
  /** Resolves true when the server kept it. On success the parent unmounts the form. */
  onSave: (text: string) => Promise<boolean>;
  onCancel: () => void;
  formTestID: string;
  inputTestID: string;
  saveTestID: string;
  cancelTestID: string;
};

/** Writing one line in place: a profile line or a note about a thing. */
export default function LineForm({
  initial,
  label,
  maxLength,
  onSave,
  onCancel,
  formTestID,
  inputTestID,
  saveTestID,
  cancelTestID,
}: LineFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const trimmed = text.trim();

  const save = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    const ok = await onSave(trimmed);
    // On success the parent unmounts this form, so there is nothing left to reset.
    if (!ok) setSaving(false);
  };

  return (
    <View testID={formTestID}>
      <Input
        compact
        multiline
        autoFocus
        label={label}
        value={text}
        onChangeText={setText}
        maxLength={maxLength}
        accessibilityLabel={label}
        testID={inputTestID}
      />
      <Text className="mt-1 self-end font-mono text-[11px] text-text-3">
        {text.length}/{maxLength}
      </Text>
      <View className="mt-1 flex-row flex-wrap gap-2">
        <Button
          text={t('Save')}
          mode="primary"
          size="auto"
          disabled={!trimmed}
          submitting={saving}
          onPress={() => void save()}
          // Keeps its width while the spinner stands in for the label.
          className="min-w-[104px]"
          testID={saveTestID}
        />
        <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onCancel} testID={cancelTestID} />
      </View>
    </View>
  );
}
