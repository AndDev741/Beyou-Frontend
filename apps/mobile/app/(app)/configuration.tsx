import { Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import ComingSoon from '../../src/ui/dashboard/ComingSoon';
import { logout } from '../../src/auth/authSlice';
import type { AppDispatch } from '../../src/store';

const ON_PRIMARY = '#FFFFFF';

/**
 * Configuration stub. The full settings screen is a future phase, but logout
 * lives here (its eventual home, mirroring the web), so it stays reachable now
 * that the dashboard no longer carries a placeholder logout button.
 */
export default function ConfigurationScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  return (
    <ComingSoon titleKey="Config">
      <Pressable
        onPress={() => dispatch(logout())}
        accessibilityRole="button"
        testID="logout-button"
        className="mt-10 rounded-md bg-error px-8 py-3"
      >
        <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">
          {t('Logout')}
        </Text>
      </Pressable>
    </ComingSoon>
  );
}
