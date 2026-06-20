import { View, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { languageInUserEnter } from '@beyou/state/user/perfilSlice';
import LanguageToggle from '../LanguageToggle';
import { notify } from '../../notify';
import type { AppDispatch } from '../../store';

/**
 * Language preference: the EN | PT switch. Selecting a language switches the live
 * i18n language immediately (LanguageToggle) and persists it via
 * editUser({language}). No success toast — the live switch is its own feedback;
 * errors surface a toast.
 */
export default function LanguageSection() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const persist = async (lng: 'en' | 'pt') => {
    dispatch(languageInUserEnter(lng));
    const res = await editUser({ language: lng });
    if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
  };

  return (
    <View testID="config-language">
      <Text className="text-secondary text-base font-semibold">{t('Language')}</Text>
      <LanguageToggle onSelect={persist} />
    </View>
  );
}
