import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export const DAYS = [
  { wire: 'Monday', key: 'Mon' },
  { wire: 'Tuesday', key: 'Tue' },
  { wire: 'Wednesday', key: 'Wed' },
  { wire: 'Thursday', key: 'Thu' },
  { wire: 'Friday', key: 'Fri' },
  { wire: 'Saturday', key: 'Sat' },
  { wire: 'Sunday', key: 'Sun' },
] as const;

export default function ScheduleIndicator({ days }: { days?: string[] }) {
  const { t } = useTranslation();
  if (!days || days.length === 0) {
    return <Text className="text-description text-sm">{t('No schedule set')}</Text>;
  }
  const label = DAYS.filter((d) => days.includes(d.wire))
    .map((d) => t(d.key))
    .join(' · ');
  return <Text className="text-secondary text-sm font-semibold">{label}</Text>;
}
