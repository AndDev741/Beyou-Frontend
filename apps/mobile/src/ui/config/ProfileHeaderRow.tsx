import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { resolvePhotoUrl } from '../../lib/photoUrl';
import type { RootState } from '../../store';

/**
 * A linha fechada do cartão de perfil: avatar, nome e o nível de relance.
 * O e-mail não entra — é o dado mais sensível da tela e não ajuda a decidir
 * se vale abrir.
 */
export default function ProfileHeaderRow() {
  const { t } = useTranslation();
  const name = useSelector((s: RootState) => s.perfil.username);
  const photo = useSelector((s: RootState) => s.perfil.photo);
  const level = useSelector((s: RootState) => s.perfil.level);
  const xp = useSelector((s: RootState) => s.perfil.xp);
  const nextLevelXp = useSelector((s: RootState) => s.perfil.nextLevelXp);
  const uri = photo ? resolvePhotoUrl(photo) : '';

  return (
    <View className="flex-row items-center gap-3">
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityIgnoresInvertColors
          className="h-10 w-10 rounded-full border border-border"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
          <Text className="text-base font-semibold text-accent">
            {(name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="font-mono text-[11px] text-text-3" numberOfLines={1}>
          {`${t('Level').toLowerCase()} ${level} · ${xp}/${nextLevelXp} XP`}
        </Text>
      </View>
    </View>
  );
}
