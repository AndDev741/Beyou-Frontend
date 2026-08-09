import { View, Text, Linking, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { languageInUserEnter } from '@beyou/state/user/perfilSlice';
import SegmentedControl from '../SegmentedControl';
import { notify } from '../../notify';
import type { AppDispatch } from '../../store';

const TRANSLATIONS_URL = 'https://github.com/AndDev741/Beyou-Frontend/tree/main/src/translations';

/**
 * Language in the same segmented control as the rest of the app, with the names
 * spelled out (Português | English) as on the web — "EN | PT" in a little box looked
 * like it belonged to nothing.
 *
 * Trocar aplica na hora e persiste via editUser. Sem toast de sucesso: a troca
 * live is the feedback itself; only an error speaks up.
 */
export default function LanguageSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const current = i18n.language === 'en' ? 'en' : 'pt';

  const persist = async (lng: string) => {
    const next = lng === 'en' ? 'en' : 'pt';
    await i18n.changeLanguage(next);
    dispatch(languageInUserEnter(next));
    const res = await editUser({ language: next });
    if (res?.error) notify.error(getFriendlyErrorMessage(t, res.error));
  };

  return (
    <View testID="config-language">
      <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('Language')}</Text>
      <SegmentedControl
        label={t('Language')}
        value={current}
        onChange={persist}
        options={[
          { value: 'pt', label: 'Português' },
          { value: 'en', label: 'English' },
        ]}
        testID="language-toggle"
      />
      <Pressable onPress={() => Linking.openURL(TRANSLATIONS_URL)} accessibilityRole="link">
        <Text className="mt-1.5 text-[11px] text-text-3 underline">{t('Help translate phrase')}</Text>
      </Pressable>
    </View>
  );
}
