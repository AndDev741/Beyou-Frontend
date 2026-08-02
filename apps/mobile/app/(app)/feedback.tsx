import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import submitFeedback from '@beyou/api/feedback/submitFeedback';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { ApiErrorPayload } from '@beyou/api/apiError';
import Input from '../../src/ui/Input';
import AttachmentsField from '../../src/ui/feedback/AttachmentsField';
import { useFeedbackContext } from '../../src/ui/feedback/useFeedbackContext';
import { buildFeedbackMailtoHref, FEEDBACK_CATEGORY_LABEL_KEYS } from '../../src/ui/feedback/feedbackMailto';
import { openFeedbackMail } from '../../src/ui/feedback/openFeedbackMail';
import {
  CATEGORY_ORDER,
  FEEDBACK_BODY_MAX_LENGTH,
  NO_CATEGORY,
  feedbackSchema,
  type FeedbackFormValues,
} from '../../src/ui/feedback/feedbackSchema';
import { CAPTURE_FILE_NAME, CAPTURE_MIME_TYPE } from '../../src/ui/feedback/captureScreen';
import type { FeedbackImage } from '../../src/ui/feedback/feedbackAttachments';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';

type SubmissionOutcome =
  | { kind: 'sent'; failedAttachments: number }
  | { kind: 'failed'; error: ApiErrorPayload };

/** expo-router hands back `string | string[]` for every param. */
const first = (value?: string | string[]): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Dedicated feedback screen (R1). Reachable any time from the floating
 * launcher, which snapshots the screen the user was on (KTD5) and forwards both
 * the capture uri and that screen's route — so the report describes where the
 * user actually was, not `/feedback`.
 *
 * R6: only category and body are required. Images, the capture and the context
 * are optional extras. R7: the `mailto:` exit is standing, not just a failure
 * hatch.
 */
export default function FeedbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const params = useLocalSearchParams<{ capture?: string; from?: string }>();

  const capturedUri = first(params.capture);
  const context = useFeedbackContext(first(params.from) ?? '/feedback');

  const [images, setImages] = useState<FeedbackImage[]>(() =>
    capturedUri ? [{ uri: capturedUri, mimeType: CAPTURE_MIME_TYPE, name: CAPTURE_FILE_NAME }] : [],
  );
  const [outcome, setOutcome] = useState<SubmissionOutcome | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema(t)),
    defaultValues: { category: NO_CATEGORY, body: '' },
  });

  const mailtoHref = buildFeedbackMailtoHref({
    category: watch('category'),
    body: watch('body'),
    context,
    t,
  });
  const openMail = () => void openFeedbackMail(mailtoHref, t);

  const onSubmit = async (values: FeedbackFormValues) => {
    setOutcome(null);

    const result = await submitFeedback(
      {
        category: values.category,
        body: values.body,
        ...(context ? { context } : {}),
        ...(images.length > 0 ? { attachments: images } : {}),
      },
      t,
    );

    // Partial failure is still a success: the report is in the inbox, only some
    // images are not. Saying "sending failed" here would be a lie that makes
    // the user submit the same thing twice.
    if (result.success) {
      setOutcome({ kind: 'sent', failedAttachments: result.success.failedAttachments.length });
      reset({ category: NO_CATEGORY, body: '' });
      setImages([]);
      return;
    }

    setOutcome({ kind: 'failed', error: result.error ?? { message: t('UnexpectedError') } });
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center gap-2 px-4 pb-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={theme.primary} />
        </Pressable>
        <Text className="text-accent text-2xl font-bold">{t('FeedbackPageTitle')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 48, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-text-2 text-sm">{t('FeedbackIntro')}</Text>

        {outcome?.kind === 'sent' ? (
          <View
            testID="feedback-success"
            accessibilityRole="alert"
            className="gap-1 rounded-card border-2 border-success p-4"
          >
            <Text className="text-success text-base font-semibold">{t('FeedbackSuccessTitle')}</Text>
            <Text className="text-text-2 text-sm">{t('FeedbackSuccessBody')}</Text>
            {outcome.failedAttachments > 0 ? (
              <Text className="text-danger text-sm font-medium">
                {t('FeedbackPartialAttachmentWarning', { count: outcome.failedAttachments })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {outcome?.kind === 'failed' ? (
          <View
            testID="feedback-failure"
            accessibilityRole="alert"
            className="gap-1 rounded-card border-2 border-danger p-4"
          >
            <Text className="text-danger text-base font-semibold">{t('FeedbackFailedTitle')}</Text>
            <Text className="text-text-2 text-sm">{t('FeedbackFailedBody')}</Text>
            <Text className="text-text-2 text-sm">
              {getFriendlyErrorMessage(t, outcome.error)}
            </Text>
            <Pressable
              onPress={openMail}
              accessibilityRole="button"
              testID="feedback-mailto-fallback"
              className="mt-2 flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2"
            >
              <Ionicons name="mail-outline" size={16} color={theme.primary} />
              <Text className="text-accent text-sm font-semibold">{t('FeedbackEmailLink')}</Text>
            </Pressable>
          </View>
        ) : null}

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <View className="gap-2">
              <Text className="text-text text-base font-semibold">
                {t('FeedbackCategoryLabel')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORY_ORDER.map((category) => {
                  const chosen = field.value === category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => field.onChange(category)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: chosen }}
                      accessibilityLabel={t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                      testID={`feedback-category-${category}`}
                      className={`rounded-full border px-4 py-2 ${
                        chosen ? 'border-accent bg-accent' : 'border-border'
                      }`}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: chosen ? theme.background : theme.secondary }}
                      >
                        {t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.category?.message ? (
                <Text className="text-danger text-sm" testID="feedback-category-error">
                  {errors.category.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <View className="gap-2">
              <Text className="text-text text-base font-semibold">
                {t('FeedbackBodyLabel')}
              </Text>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                multiline
                maxLength={FEEDBACK_BODY_MAX_LENGTH}
                placeholder={t('FeedbackBodyPlaceholder')}
                accessibilityLabel={t('FeedbackBodyLabel')}
                error={errors.body?.message}
                testID="feedback-body"
              />
            </View>
          )}
        />

        <AttachmentsField images={images} onChange={setImages} />

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          accessibilityRole="button"
          testID="feedback-submit"
          className={`flex-row items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 ${
            isSubmitting ? 'opacity-60' : ''
          }`}
        >
          {isSubmitting ? <ActivityIndicator size="small" color={theme.background} /> : null}
          <Text style={{ color: theme.background }} className="text-base font-semibold">
            {isSubmitting ? t('FeedbackSubmitting') : t('FeedbackSubmit')}
          </Text>
        </Pressable>

        {/* R7: the mailto is a standing alternative, not only a failure hatch. */}
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-text-2 text-sm">{t('FeedbackEmailPreference')}</Text>
          <Pressable
            onPress={openMail}
            accessibilityRole="button"
            testID="feedback-mailto-preference"
          >
            <Text className="text-accent text-sm font-semibold underline">
              {t('FeedbackEmailLink')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
