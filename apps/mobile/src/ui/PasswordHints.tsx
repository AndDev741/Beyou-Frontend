import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

const MIN_LENGTH = 12;
const MIN_CLASSES = 2;

const countClasses = (value: string): number => {
  let c = 0;
  if (/[a-z]/.test(value)) c++;
  if (/[A-Z]/.test(value)) c++;
  if (/[0-9]/.test(value)) c++;
  if (/[^a-zA-Z0-9]/.test(value)) c++;
  return c;
};

interface PasswordHintsProps {
  password: string;
}

export default function PasswordHints({ password }: PasswordHintsProps) {
  const { t } = useTranslation();
  const v = password.trim();
  const hints = [
    { key: 'PasswordHintLength', ok: v.length >= MIN_LENGTH },
    { key: 'PasswordHintClasses', ok: countClasses(v) >= MIN_CLASSES },
  ];
  return (
    <View className="w-full mt-1" testID="password-hints">
      {hints.map((h) => (
        <Text
          key={h.key}
          className={h.ok ? 'text-success text-xs' : 'text-description text-xs'}
          testID={`${h.key}-${h.ok ? 'ok' : 'pending'}`}
        >
          {h.ok ? '✓ ' : '• '}
          {t(h.key)}
        </Text>
      ))}
    </View>
  );
}
