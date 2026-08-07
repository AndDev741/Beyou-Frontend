import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Chip from './Chip';
import { attributeVariant } from './habits/levelLabels';

/**
 * O rótulo vem junto do valor: "Média" sozinho não diz se é importância ou
 * dificuldade. Mesma regra dos cartões da web.
 */
export default function AttributeChip({
  label,
  value,
  phraseKey,
  testID,
}: {
  label: string;
  value: number;
  phraseKey: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  if (!phraseKey) return null;
  return (
    <Chip size="sm" variant={attributeVariant(value)} testID={testID}>
      <Text className="text-[11px] font-normal text-text-2">{label}</Text>
      <Text className="text-[11px] text-text-3">·</Text>
      <Text className="text-[11px] font-semibold text-text">{t(phraseKey)}</Text>
    </Chip>
  );
}
