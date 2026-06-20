import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import OptionCard from './OptionCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';

type ConstanceMode = 'ANY' | 'COMPLETE';

const OPTIONS: Array<{
  id: ConstanceMode;
  titleKey: string;
  descriptionKey: string;
  detailKey: string;
}> = [
  {
    id: 'ANY',
    titleKey: 'ConstanceOptionTaskTitle',
    descriptionKey: 'ConstanceOptionTaskDescription',
    detailKey: 'ConstanceOptionTaskDetail',
  },
  {
    id: 'COMPLETE',
    titleKey: 'ConstanceOptionRoutineTitle',
    descriptionKey: 'ConstanceOptionRoutineDescription',
    detailKey: 'ConstanceOptionRoutineDetail',
  },
];

/**
 * Streak (constance) configuration: ANY (any check counts) vs COMPLETE (whole
 * routine must be done). editUser-only — there is no perfil field for this, so it
 * stays local state and just fires + toasts on Save. Mirrors the web
 * ConstanceConfiguration component.
 */
export default function ConstanceSection({
  initialMode = 'ANY',
}: {
  initialMode?: ConstanceMode;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [selectedMode, setSelectedMode] = useState<ConstanceMode>(initialMode);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    const res = await editUser({ constanceConfiguration: selectedMode });
    if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
    else notify.success(t('SettingsSaved'));
    setSaving(false);
  };

  return (
    <View className="gap-3" testID="config-constance">
      <View>
        <Text className="text-secondary text-base font-semibold">{t('ConstanceTitle')}</Text>
        <Text className="text-description mt-0.5 text-sm">{t('ConstanceDescription')}</Text>
      </View>

      <View className="gap-2">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            title={t(opt.titleKey)}
            description={t(opt.descriptionKey)}
            detail={t(opt.detailKey)}
            selected={selectedMode === opt.id}
            onPress={() => setSelectedMode(opt.id)}
            testID={`constance-${opt.id}`}
          />
        ))}
      </View>

      <Pressable
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        testID="save-constance"
        className={`items-center rounded-md bg-primary px-6 py-3 ${saving ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: theme.background }} className="text-base font-semibold">
          {saving ? t('Saving...') : t('Save')}
        </Text>
      </Pressable>
    </View>
  );
}
