import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bug, ChevronLeft, Lightbulb, Mail, MessageSquare, Send } from 'lucide-react-native';
import submitFeedback from '@beyou/api/feedback/submitFeedback';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { ApiErrorPayload } from '@beyou/api/apiError';
import Input from '../../src/ui/Input';
import AttachmentsField from '../../src/ui/feedback/AttachmentsField';
import Button from '../../src/ui/Button';
import FormField from '../../src/ui/form/FormField';
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

/** The icon shows only on the chosen option — it backs the choice without noise. */
const CATEGORY_ICONS = {
  BUG: Bug,
  FEATURE_REQUEST: Lightbulb,
  OTHER: MessageSquare,
} as const;

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
          <ChevronLeft size={24} color={theme.text2} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
            {t('FeedbackPageTitle')}
          </Text>
          <Text className="text-[12.5px] text-text-3" numberOfLines={2}>
            {t('FeedbackIntro')}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 48, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
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
              <Mail size={16} color={theme.accent} />
              <Text className="text-accent text-sm font-semibold">{t('FeedbackEmailLink')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* The whole form in one card: subject, text and attachments are one thing,
            and the border says where it starts and ends. */}
        <View className="gap-4 rounded-card border border-border bg-surface p-4">
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <FormField label={t('FeedbackCategoryLabel')} error={errors.category?.message}>
                {/* Segmented, like the rest of the forms: the three options are
                    exclusivas e cabem numa linha, inclusive no telefone. */}
                <View className="flex-row rounded-control border border-border bg-surface-2 p-[3px]">
                  {CATEGORY_ORDER.map((category) => {
                    const chosen = field.value === category;
                    const Icon = CATEGORY_ICONS[category];
                    return (
                      <Pressable
                        key={category}
                        onPress={() => field.onChange(category)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: chosen }}
                        accessibilityLabel={t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                        testID={`feedback-category-${category}`}
                        className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[7px] px-2 py-2 ${
                          chosen ? 'bg-surface' : ''
                        }`}
                      >
                        {chosen ? <Icon size={13} color={theme.accent} /> : null}
                        <Text
                          className={`text-[12.5px] font-semibold ${chosen ? 'text-accent' : 'text-text-3'}`}
                          numberOfLines={1}
                        >
                          {t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <FormField label={t('FeedbackBodyLabel')}>
                <Input
                  compact
                  multiline
                  value={field.value}
                  onChangeText={field.onChange}
                  maxLength={FEEDBACK_BODY_MAX_LENGTH}
                  placeholder={t('FeedbackBodyPlaceholder')}
                  accessibilityLabel={t('FeedbackBodyLabel')}
                  error={errors.body?.message}
                  testID="feedback-body"
                />
              </FormField>
            )}
          />

          <AttachmentsField images={images} onChange={setImages} />

          <Button
            text={isSubmitting ? t('FeedbackSubmitting') : t('FeedbackSubmit')}
            mode="primary"
            size="auto"
            icon={<Send size={16} color={theme.onAccent} />}
            submitting={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            testID="feedback-submit"
            className="w-full"
          />
        </View>

        {/* Email is a standing alternative, not just the failure hatch — one row,
            below the card. */}
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="text-[12.5px] text-text-3">{t('FeedbackEmailPreference')}</Text>
          <Pressable onPress={openMail} accessibilityRole="button" testID="feedback-mailto-preference">
            <Text className="text-[12.5px] font-semibold text-accent">{t('FeedbackEmailLink')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
