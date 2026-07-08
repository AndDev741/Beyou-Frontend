import { useState } from 'react';
import { View, Text, Pressable, Image, Modal } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { profileSchema } from '@beyou/validation';
import editUser from '@beyou/api/user/editUser';
import uploadUserPhoto from '@beyou/api/user/uploadUserPhoto';
import getProfile from '@beyou/api/user/getProfile';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  nameEnter,
  photoEnter,
  phraseEnter,
  phraseAuthorEnter,
  hydratePerfil,
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
  const [photoPreview, setPhotoPreview] = useState(perfil.photo);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [photoUploading, setPhotoUploading] = useState(false);

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

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPhotoError(t('PhotoPermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotoAsset(asset);
      setPhotoPreview(asset.uri);
      setPhotoError(undefined);
    }
  };

  const confirmUpload = async () => {
    if (!photoAsset) {
      setPhotoError(t('PhotoUploadNoFile'));
      return;
    }
    setPhotoUploading(true);
    setPhotoError(undefined);

    // Build a Blob from the picked image URI
    const response = await fetch(photoAsset.uri);
    const blob = await response.blob();

    const uploadRes = await uploadUserPhoto(blob);
    if (uploadRes.error) {
      setPhotoError(getFriendlyErrorMessage(t, uploadRes.error));
      setPhotoUploading(false);
      return;
    }

    // Re-fetch profile to get updated photo URL
    const profileRes = await getProfile();
    if (profileRes.data) {
      dispatch(hydratePerfil(profileRes.data));
    }

    setPhotoUploading(false);
    setPhotoModal(false);
    setPhotoAsset(null);
    notify.success(t('SuccessEditProfile'));
  };

  return (
    <View className="gap-3" testID="config-profile">
      <View className="flex-row items-center gap-3">
        <Avatar photo={photo} name={perfil.username} />
        <Pressable
          onPress={() => {
            setPhotoPreview(photo);
            setPhotoAsset(null);
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
        className={`mt-2 items-center rounded-md bg-primary px-6 py-3 ${isSubmitting ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">
          {t('Save')}
        </Text>
      </Pressable>

      <Modal visible={photoModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl" testID="photo-modal">
            <Text className="mb-4 text-lg font-semibold text-secondary">{t('ChangePhoto')}</Text>

            <View className="items-center gap-4">
              <Image
                source={{ uri: photoPreview }}
                className="h-32 w-32 rounded-full border-4 border-primary"
              />

              <Pressable
                onPress={pickPhoto}
                className="rounded-lg bg-primary px-4 py-2 active:opacity-80"
              >
                <Text className="font-medium text-white">
                  {photoAsset ? t('PhotoSelected') : t('ChooseFile')}
                </Text>
              </Pressable>

              {photoError && (
                <Text className="text-center text-sm text-error">{photoError}</Text>
              )}
            </View>

            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setPhotoModal(false);
                  setPhotoAsset(null);
                  setPhotoError(undefined);
                  setPhotoPreview(photo);
                }}
                className="rounded-lg px-4 py-2 active:opacity-80"
              >
                <Text className="text-secondary">{t('Cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmUpload}
                disabled={photoUploading || !photoAsset}
                className="rounded-lg bg-primary px-4 py-2 active:opacity-80 disabled:opacity-50"
              >
                <Text className="font-medium text-white">
                  {photoUploading ? t('PhotoUploading') : t('Save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
