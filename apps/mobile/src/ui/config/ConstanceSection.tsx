import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import OptionCard from './OptionCard';
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
  const [selectedMode, setSelectedMode] = useState<ConstanceMode>(initialMode);

  // Saves on pick: only the profile has a save button. A single choice needs no
  // confirmation — the toast already says it went through.
  const select = async (mode: ConstanceMode) => {
    setSelectedMode(mode);
    const res = await editUser({ constanceConfiguration: mode });
    if (res?.error) notify.error(getFriendlyErrorMessage(t, res.error));
    else notify.success(t('SettingsSaved'));
  };

  return (
    <View className="gap-3" testID="config-constance">
      <View>
        <Text className="text-[12.5px] font-semibold text-text-2">{t('ConstanceTitle')}</Text>
        <Text className="mt-0.5 text-xs text-text-3">{t('ConstanceDescription')}</Text>
      </View>

      <View className="gap-2">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            title={t(opt.titleKey)}
            description={t(opt.descriptionKey)}
            detail={t(opt.detailKey)}
            selected={selectedMode === opt.id}
            onPress={() => select(opt.id)}
            testID={`constance-${opt.id}`}
          />
        ))}
      </View>

    </View>
  );
}
