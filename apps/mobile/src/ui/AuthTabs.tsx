import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

interface Props {
  active: 'login' | 'register';
}

/**
 * Login | Register tab switcher with an active-underline, mirroring the web
 * `authentication/header.tsx`. Tapping a tab navigates to the sibling auth route.
 */
export default function AuthTabs({ active }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const isLogin = active === 'login';

  return (
    <View className="w-full" testID="auth-tabs">
      <View className="flex-row justify-evenly py-6">
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="tab"
          accessibilityState={{ selected: isLogin }}
          testID="auth-tab-login"
        >
          <Text className={`text-2xl ${isLogin ? 'text-primary font-semibold' : 'text-secondary'}`}>
            {t('Login')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(auth)/register')}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isLogin }}
          testID="auth-tab-register"
        >
          <Text className={`text-2xl ${!isLogin ? 'text-primary font-semibold' : 'text-secondary'}`}>
            {t('Register')}
          </Text>
        </Pressable>
      </View>

      {/* Active-tab underline: left half under Login, right half under Register. */}
      <View className={isLogin ? 'items-start' : 'items-end'}>
        <View className="w-1/2 border-b-2 border-primary" />
      </View>
    </View>
  );
}
