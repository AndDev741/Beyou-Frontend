import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import WidgetCard from './WidgetCard';

export interface ConstanceWidgetProps {
  constance: number;
}

/** Streak count widget — mirrors the web Constance widget. */
export default function ConstanceWidget({ constance }: ConstanceWidgetProps) {
  const { t } = useTranslation();
  return (
    <WidgetCard title={t('Constance')} testID="widget-constance">
      <Text className="text-accent text-2xl font-semibold">{constance}</Text>
      <Text className="text-text text-lg font-semibold">{t('Days', { count: constance })}</Text>
    </WidgetCard>
  );
}
