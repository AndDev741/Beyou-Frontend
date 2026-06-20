import { useState } from 'react';
import { View, Text, Pressable, Image, Modal, TextInput } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { profileSchema } from '@beyou/validation';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  nameEnter,
  photoEnter,
  phraseEnter,
  phraseAuthorEnter,
} from '@beyou/state/user/perfilSlice';
import Input from '../Input';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

const ON_PRIMARY = '#FFFFFF';

function Avatar({ photo, name }: { photo: string; name: string }) {
  const { theme } = useBeyouTheme();
  if (photo) {
    return <Image source={{ uri: photo }} className="h-16 w-16 rounded-full border-2 border-primary" />;
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

type ProfileForm = { name: string; photo: string; phrase: string; phrase_author: string };

export default function ProfileSection() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const perfil = useSelector((s: RootState) => s.perfil);

  const [photoModal, setPhotoModal] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(perfil.photo);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema(t)),
    defaultValues: {
      name: perfil.username,
      photo: perfil.photo,
      phrase: perfil.phrase,
      phrase_author: perfil.phrase_author,
    },
  });

  const photo = watch('photo');

  const onSave = async (data: ProfileForm) => {
    const res = await editUser(data);
    if (res.data) {
      dispatch(nameEnter(data.name));
      dispatch(photoEnter(data.photo ?? ''));
      dispatch(phraseEnter(data.phrase ?? ''));
      dispatch(phraseAuthorEnter(data.phrase_author ?? ''));
      notify.success(t('SuccessEditProfile'));
    } else {
      notify.error(getFriendlyErrorMessage(t, res.error));
    }
  };

  const confirmPhoto = () => {
    const url = photoDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setPhotoError(t('ProfilePhotoUrlInvalid'));
      return;
    }
    setValue('photo', url, { shouldValidate: true });
    setPhotoError(undefined);
    setPhotoModal(false);
  };

  return (
    <View className="gap-3" testID="config-profile">
      <View className="flex-row items-center gap-3">
        <Avatar photo={photo} name={perfil.username} />
        <Pressable
          onPress={() => {
            setPhotoDraft(photo);
            setPhotoError(undefined);
            setPhotoModal(true);
          }}
          accessibilityRole="button"
          testID="change-photo"
          className="rounded-md border border-primary px-3 py-2"
        >
          <Text className="text-primary font-semibold">{t('ChangeProfilePhoto')}</Text>
        </Pressable>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            value={field.value}
            onChangeText={field.onChange}
            placeholder={t('NamePlaceholder')}
            error={errors.name?.message}
            accessibilityLabel={t('Name')}
            testID="config-name"
          />
        )}
      />

      <Input
        value={perfil.email}
        onChangeText={() => {}}
        disabled
        accessibilityLabel={t('Email')}
        testID="config-email"
      />

      <Controller
        control={control}
        name="phrase"
        render={({ field }) => (
          <Input
            value={field.value ?? ''}
            onChangeText={field.onChange}
            placeholder={t('Phrase')}
            error={errors.phrase?.message}
            accessibilityLabel={t('Phrase')}
            testID="config-phrase"
          />
        )}
      />

      <Controller
        control={control}
        name="phrase_author"
        render={({ field }) => (
          <Input
            value={field.value ?? ''}
            onChangeText={field.onChange}
            placeholder={t('Author')}
            error={errors.phrase_author?.message}
            accessibilityLabel={t('Author')}
            testID="config-author"
          />
        )}
      />

      <Pressable
        onPress={handleSubmit(onSave)}
        disabled={isSubmitting}
        accessibilityRole="button"
        testID="save-profile"
        className={`mt-4 items-center rounded-md bg-primary px-6 py-3 ${isSubmitting ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">
          {t('Save')}
        </Text>
      </Pressable>

      <Modal visible={photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl border-2 border-primary bg-background p-5" testID="photo-modal">
            <Text className="text-secondary mb-3 text-lg font-bold">{t('ChangeProfilePhoto')}</Text>
            {photoDraft ? (
              <Image source={{ uri: photoDraft }} className="mb-3 h-20 w-20 self-center rounded-full border border-primary" />
            ) : null}
            <TextInput
              value={photoDraft}
              onChangeText={setPhotoDraft}
              placeholder={t('EnterPhotoURL')}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="photo-url-input"
              className="border-2 border-primary rounded-md px-3 py-2 text-secondary"
            />
            {photoError ? <Text className="text-error mt-1 text-sm">{photoError}</Text> : null}
            <View className="mt-4 flex-row justify-end gap-3">
              <Pressable onPress={() => setPhotoModal(false)} accessibilityRole="button" className="px-4 py-2">
                <Text className="text-description font-semibold">{t('Cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmPhoto} accessibilityRole="button" testID="photo-save" className="rounded-md bg-primary px-4 py-2">
                <Text style={{ color: ON_PRIMARY }} className="font-semibold">{t('Save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
