import { useState } from 'react';
import { View, Text, Pressable, Image, Modal } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { profileSchema } from '@beyou/validation';
import editUser from '@beyou/api/user/editUser';
import getProfile from '@beyou/api/user/getProfile';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  nameEnter,
  phraseEnter,
  phraseAuthorEnter,
  hydratePerfil,
} from '@beyou/state/user/perfilSlice';
import { Pencil } from 'lucide-react-native';
import Input from '../Input';
import Button from '../Button';
import FormField from '../form/FormField';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import { resolvePhotoUrl } from '../../lib/photoUrl';
import { uploadPhoto } from '../../lib/uploadPhoto';
import type { RootState, AppDispatch } from '../../store';


type ProfileForm = { name: string; phrase: string; phrase_author: string };

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
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema(t)),
    defaultValues: {
      name: perfil.username,
      phrase: perfil.phrase,
      phrase_author: perfil.phrase_author,
    },
  });

  // Photo is no longer a form field — it's managed by the upload flow. Read it
  // straight from Redux so it updates after a successful upload (photoEnter).
  const photo = perfil.photo;

  const onSave = async (data: ProfileForm) => {
    const res = await editUser(data);
    if (res.data) {
      dispatch(nameEnter(data.name));
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
      setPhotoError(t('PHOTO_UPLOAD_NO_FILE'));
      return;
    }
    setPhotoUploading(true);
    setPhotoError(undefined);

    // expo-file-system uploads the picked file natively from its uri.
    const uploadRes = await uploadPhoto(photoAsset.uri, photoAsset.mimeType);
    if (uploadRes.error) {
      setPhotoError(getFriendlyErrorMessage(t, uploadRes.error));
      setPhotoUploading(false);
      return;
    }

    // Re-fetch profile — the served photo URL is versioned by the backend
    // (?v=<file-mtime>), so hydrate alone busts the image cache on change.
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
    // No card of its own: the section draws the frame. The photo button sits at the
    // top and the fields take the full width, as on the web.
    <View testID="config-profile">
      <Pressable
        onPress={() => {
          setPhotoPreview(photo);
          setPhotoAsset(null);
          setPhotoError(undefined);
          setPhotoModal(true);
        }}
        accessibilityRole="button"
        testID="change-photo"
        className="flex-row items-center gap-1.5 self-start rounded-control bg-accent-soft px-3.5 py-2 active:opacity-80"
      >
        <Text className="text-[12.5px] font-semibold text-accent">{t('ChangePhotoShort')}</Text>
        <Pencil size={13} color={theme.accent} />
      </Pressable>

      <FormField label={t('Name')} className="mt-4">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              compact
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('NamePlaceholder')}
              error={errors.name?.message}
              accessibilityLabel={t('Name')}
              testID="config-name"
            />
          )}
        />
      </FormField>

      <FormField label={t('Email')} className="mt-4">
        <Input
          compact
          disabled
          value={perfil.email}
          onChangeText={() => {}}
          accessibilityLabel={t('Email')}
          testID="config-email"
        />
      </FormField>

      <FormField label={t('Phrase')} className="mt-4">
        <Controller
          control={control}
          name="phrase"
          render={({ field }) => (
            <Input
              compact
              multiline
              value={field.value ?? ''}
              onChangeText={field.onChange}
              placeholder={t('PhrasePlaceholder')}
              error={errors.phrase?.message}
              accessibilityLabel={t('Phrase')}
              testID="config-phrase"
            />
          )}
        />
      </FormField>

      <FormField label={t('Author')} className="mt-4">
        <Controller
          control={control}
          name="phrase_author"
          render={({ field }) => (
            <Input
              compact
              value={field.value ?? ''}
              onChangeText={field.onChange}
              placeholder={t('AuthorPlaceholder')}
              error={errors.phrase_author?.message}
              accessibilityLabel={t('Author')}
              testID="config-author"
            />
          )}
        />
      </FormField>

      {/* The profile is the ONLY section with a save button; everything else persists
          on pick. Right-aligned, as on the web. */}
      <View className="mt-[18px] flex-row justify-end">
        <Button
          text={t('SaveProfile')}
          mode="primary"
          size="auto"
          submitting={isSubmitting}
          onPress={handleSubmit(onSave)}
          testID="save-profile"
        />
      </View>

      <Modal visible={photoModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="w-full max-w-sm rounded-card bg-surface p-6 shadow-2xl" testID="photo-modal">
            <Text className="mb-4 text-lg font-semibold text-text">{t('ChangePhoto')}</Text>

            <View className="items-center gap-4">
              <Image
                source={{ uri: resolvePhotoUrl(photoPreview) }}
                className="h-32 w-32 rounded-full border-4 border-border"
              />

              <Pressable
                onPress={pickPhoto}
                className="rounded-control bg-accent px-4 py-2 active:opacity-80"
              >
                <Text className="font-medium text-white">
                  {photoAsset ? t('PhotoSelected') : t('ChooseFile')}
                </Text>
              </Pressable>

              {photoError && (
                <Text className="text-center text-sm text-danger">{photoError}</Text>
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
                className="rounded-control px-4 py-2 active:opacity-80"
              >
                <Text className="text-text">{t('Cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmUpload}
                disabled={photoUploading || !photoAsset}
                className="rounded-control bg-accent px-4 py-2 active:opacity-80 disabled:opacity-50"
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
