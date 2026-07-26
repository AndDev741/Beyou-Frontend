import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { MAX_ATTACHMENTS, selectImages, type FeedbackImage } from './feedbackAttachments';

interface Props {
  images: FeedbackImage[];
  onChange: (next: FeedbackImage[]) => void;
}

/**
 * The optional images block (R3). Reuses the same picker path as the profile
 * photo upload, so mobile has one way to get a `file://` uri and one set of
 * permission copy.
 */
export default function AttachmentsField({ images, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [errors, setErrors] = useState<string[]>([]);

  const full = images.length >= MAX_ATTACHMENTS;

  const pick = async () => {
    if (full) {
      setErrors([t('FeedbackImageLimitReached')]);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrors([t('PhotoPermissionDenied')]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - images.length,
      quality: 0.85,
    });
    if (result.canceled) return;

    const { accepted, errors: rejections } = selectImages(result.assets, images.length, t);
    setErrors(rejections);
    if (accepted.length > 0) onChange([...images, ...accepted]);
  };

  const remove = (index: number) => {
    setErrors([]);
    onChange(images.filter((_, position) => position !== index));
  };

  return (
    <View className="gap-2">
      <Text className="text-secondary text-base font-semibold">{t('FeedbackImagesLabel')}</Text>
      <Text className="text-description text-xs">{t('FeedbackImagesHint')}</Text>

      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel={t('FeedbackAddImages')}
        testID="feedback-add-images"
        className={`flex-row items-center gap-2 self-start rounded-full border border-primary px-4 py-2 ${
          full ? 'opacity-60' : ''
        }`}
      >
        <Ionicons name="attach" size={16} color={theme.primary} />
        <Text className="text-primary text-sm font-semibold">{t('FeedbackAddImages')}</Text>
      </Pressable>

      {errors.length > 0 ? (
        <View className="gap-0.5" testID="feedback-image-errors">
          {errors.map((message) => (
            <Text key={message} className="text-error text-sm">
              {message}
            </Text>
          ))}
        </View>
      ) : null}

      {images.length > 0 ? (
        <View className="mt-1 flex-row flex-wrap gap-3">
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} testID={`feedback-attachment-${index}`}>
              <Image
                source={{ uri: image.uri }}
                className="h-24 w-24 rounded-lg border border-primary"
                accessibilityLabel={image.name}
              />
              <Pressable
                onPress={() => remove(index)}
                accessibilityRole="button"
                accessibilityLabel={t('FeedbackRemoveImage', { name: image.name })}
                testID={`feedback-remove-image-${index}`}
                className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full border border-primary bg-background"
              >
                <Ionicons name="close" size={16} color={theme.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
