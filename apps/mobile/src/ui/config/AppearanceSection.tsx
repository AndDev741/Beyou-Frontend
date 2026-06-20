import { useTranslation } from 'react-i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import ThemeSelector from '../ThemeSelector';
import { notify } from '../../notify';

/**
 * Appearance settings: the theme swatch picker. Selecting a swatch switches the
 * live theme immediately (ThemeSelector) and persists it via editUser({theme}).
 * No success toast — the live preview is the feedback; errors surface a toast.
 */
export default function AppearanceSection() {
  const { t } = useTranslation();

  const persist = async (mode: string) => {
    const res = await editUser({ theme: mode });
    if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
  };

  return <ThemeSelector onSelect={persist} />;
}
