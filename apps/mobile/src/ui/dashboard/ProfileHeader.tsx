import { View, Text, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getGreetingKey, calculateLevelProgress } from '@beyou/state/dashboard/helpers';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useTutorialTarget } from '../../tutorial/useTutorialTarget';
import ProgressRing from './ProgressRing';
import type { RootState } from '../../store';
import { resolvePhotoUrl } from '../../lib/photoUrl';

function Avatar({ photo, name }: { photo: string; name: string }) {
  const { theme } = useBeyouTheme();
  if (photo) {
    return (
      <Image
        source={{ uri: resolvePhotoUrl(photo) }}
        accessibilityRole="image"
        className="h-16 w-16 rounded-full border-2 border-primary"
      />
    );
  }
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      className="h-16 w-16 items-center justify-center rounded-full border-2 border-primary"
      style={{ backgroundColor: theme.primary }}
    >
      <Text className="text-2xl font-bold" style={{ color: theme.background }}>
        {initial}
      </Text>
    </View>
  );
}

/**
 * Dashboard profile header — mirrors the web Perfil: time-aware greeting + name,
 * avatar (photo or initials), motivational phrase, streak, plus a level/XP ring.
 * Reads the shared perfil slice; greeting computed once on mount.
 */
export default function ProfileHeader() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const profileRef = useTutorialTarget('dashboard-profile');

  const name = useSelector((s: RootState) => s.perfil.username);
  const photo = useSelector((s: RootState) => s.perfil.photo);
  const phrase = useSelector((s: RootState) => s.perfil.phrase);
  const phraseAuthor = useSelector((s: RootState) => s.perfil.phrase_author);
  const constance = useSelector((s: RootState) => s.perfil.constance);
  const xp = useSelector((s: RootState) => s.perfil.xp);
  const level = useSelector((s: RootState) => s.perfil.level);
  const actualLevelXp = useSelector((s: RootState) => s.perfil.actualLevelXp);
  const nextLevelXp = useSelector((s: RootState) => s.perfil.nextLevelXp);

  const greeting = t(getGreetingKey(new Date().getHours()));
  const levelProgress = calculateLevelProgress(xp, actualLevelXp, nextLevelXp);

  return (
    <View ref={profileRef} className="rounded-2xl border border-primary bg-background p-4" testID="profile-header">
      <View className="flex-row items-center">
        <Avatar photo={photo} name={name} />
        <View className="ml-3 flex-1">
          <Text testID="dashboard-greeting" className="text-secondary text-xl font-bold">
            {greeting}, {name}
          </Text>
          <Text className="text-primary text-sm font-medium">{t('BeYourBestVersion')}</Text>
        </View>
        <ProgressRing
          progress={levelProgress}
          centerLabel={String(level)}
          sublabel={t('Level')}
          testID="level-ring"
        />
      </View>

      {phrase ? (
        <View className="mt-3">
          <Text className="text-secondary italic" numberOfLines={2}>
            &quot;{phrase}&quot;
          </Text>
          {phraseAuthor ? <Text className="text-primary text-sm font-semibold">- {phraseAuthor}</Text> : null}
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center" testID="streak-badge">
        <Ionicons name="flame" size={18} color={theme.primary} />
        <Text className="text-secondary ml-1 font-bold">{constance}</Text>
        <Text className="text-description ml-1">
          {t('Days', { count: constance })} · {t('Constance')}
        </Text>
      </View>
    </View>
  );
}
