import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react-native';
import { getGreetingKey } from '@beyou/state/dashboard/helpers';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useTutorialTarget } from '../../tutorial/useTutorialTarget';
import Chip from '../Chip';
import type { RootState } from '../../store';

/**
 * The top of the dashboard — mirror of the web's `perfil`: greeting, the date
 * spelled out and the configurable phrase, straight on the page, no card.
 *
 * There is no avatar and no level ring here: who you are already lives in
 * configuration and the level has a widget of its own. Repeating all three in the
 * header is what pushed the routine (the content that matters) below the fold.
 */
export default function ProfileHeader() {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const profileRef = useTutorialTarget('dashboard-profile');

  const name = useSelector((s: RootState) => s.perfil.username);
  const phrase = useSelector((s: RootState) => s.perfil.phrase);
  const phraseAuthor = useSelector((s: RootState) => s.perfil.phrase_author);
  const constance = useSelector((s: RootState) => s.perfil.constance);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // The greeting changes band through the day; the date turns over at midnight.
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const greeting = t(getGreetingKey(now.getHours()));
  // `first-letter:uppercase` on the web; by hand here — pt returns "sexta-feira".
  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const fullDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <View ref={profileRef} className="flex-row items-start gap-4" testID="profile-header">
      <View className="min-w-0 flex-1">
        <Text
          testID="dashboard-greeting"
          className="text-[23px] font-semibold tracking-[-0.02em] text-text"
          numberOfLines={1}
        >
          {`${greeting}, ${name}`}
        </Text>
        <Text className="mt-0.5 text-[13px] text-text-3">{fullDate}</Text>

        {phrase ? (
          <Text className="mt-3 text-[13px] italic text-text-2">
            {`"${phrase}"`}
            {phraseAuthor ? (
              <Text className="text-xs not-italic text-text-3">{` · ${phraseAuthor}`}</Text>
            ) : null}
          </Text>
        ) : null}
      </View>

      {constance > 0 ? (
        <Chip variant="flame" className="shrink-0" icon={<Flame size={14} color={theme.flame} />}>
          {`${constance} ${t('Days', { count: constance })}`}
        </Chip>
      ) : null}
    </View>
  );
}
