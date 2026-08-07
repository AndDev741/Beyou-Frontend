import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X } from 'lucide-react-native';
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
    <View>
      <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">
        {t('FeedbackImagesLabelOptional')}
      </Text>

      {/* Zona de soltar em vez de um botão: no telefone o toque abre o mesmo
          seletor, e o alvo grande é mais fácil de acertar que uma pílula. */}
      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel={t('FeedbackAddImages')}
        testID="feedback-add-images"
        className={`items-center justify-center gap-1.5 rounded-control border border-dashed border-border px-4 py-6 ${
          full ? 'opacity-60' : ''
        }`}
      >
        <ImageIcon size={18} color={theme.text3} />
        <Text className="text-[12.5px] text-text-2">{t('FeedbackAddImages')}</Text>
        <Text className="font-mono text-[10.5px] text-text-3">{t('FeedbackImagesHint')}</Text>
      </Pressable>

      {errors.length > 0 ? (
        <View className="gap-0.5" testID="feedback-image-errors">
          {errors.map((message) => (
            <Text key={message} className="mt-1.5 text-xs text-danger">
              {message}
            </Text>
          ))}
        </View>
      ) : null}

      {images.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} testID={`feedback-attachment-${index}`}>
              <Image
                source={{ uri: image.uri }}
                className="h-24 w-24 rounded-control border border-border"
                accessibilityLabel={image.name}
              />
              <Pressable
                onPress={() => remove(index)}
                accessibilityRole="button"
                accessibilityLabel={t('FeedbackRemoveImage', { name: image.name })}
                testID={`feedback-remove-image-${index}`}
                className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full border border-border bg-surface"
              >
                <X size={14} color={theme.text2} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
