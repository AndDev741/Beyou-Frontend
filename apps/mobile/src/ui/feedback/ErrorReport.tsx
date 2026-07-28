import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import submitFeedback from '@beyou/api/feedback/submitFeedback';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { ApiErrorPayload } from '@beyou/api/apiError';
import Input from '../Input';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useFeedbackContext } from './useFeedbackContext';
import { buildFeedbackMailtoHref } from './feedbackMailto';
import { openFeedbackMail } from './openFeedbackMail';
import { CRASH_REPORT_SCREEN, buildCrashReportBody } from './crashReportBody';

interface Props {
  error: unknown;
  componentStack?: string;
  /**
   * Announced whenever a submission starts and stops. The crash boundary hosting
   * this control offers Retry, which unmounts the whole fallback — so it needs
   * to know when a report is in flight. Mirrors the web control's prop of the
   * same name.
   */
  onSendingChange?: (isSending: boolean) => void;
}

type Outcome = { kind: 'sent' } | { kind: 'failed'; error: ApiErrorPayload };

/**
 * R8: the optional report control on an error state. Collapsed behind one
 * button so the crash screen stays a crash screen — the recovery action (retry)
 * keeps top billing and reporting is offered, never demanded.
 *
 * KTD3: NO screen capture here. By the time this renders the failed screen has
 * been replaced by the fallback, so a screenshot would picture the fallback and
 * tell the maintainer nothing; the error text and component stack do the work.
 */
export default function ErrorReport({ error, componentStack, onSendingChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const context = useFeedbackContext(CRASH_REPORT_SCREEN);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const body = buildCrashReportBody({ note, error, componentStack });

  const send = async () => {
    setSending(true);
    setOutcome(null);
    onSendingChange?.(true);

    try {
      const result = await submitFeedback(
        { category: 'BUG', body, ...(context ? { context } : {}) },
        t,
      );

      setSending(false);
      setOutcome(
        result.success
          ? { kind: 'sent' }
          : { kind: 'failed', error: result.error ?? { message: t('UnexpectedError') } },
      );
    } finally {
      onSendingChange?.(false);
    }
  };

  const openMail = () =>
    void openFeedbackMail(buildFeedbackMailtoHref({ category: 'BUG', body, context, t }), t);

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        testID="error-report-open"
        className="rounded-full border border-primary px-5 py-2.5"
      >
        <Text className="text-primary font-semibold">{t('FeedbackNavLabel')}</Text>
      </Pressable>
    );
  }

  if (outcome?.kind === 'sent') {
    return (
      <View testID="error-report-success" className="w-full items-center gap-1">
        <Text className="text-success text-center text-base font-semibold">
          {t('FeedbackSuccessTitle')}
        </Text>
        <Text className="text-description text-center text-sm">{t('FeedbackSuccessBody')}</Text>
      </View>
    );
  }

  return (
    <View className="w-full gap-3">
      <Input
        value={note}
        onChangeText={setNote}
        multiline
        placeholder={t('FeedbackBodyPlaceholder')}
        accessibilityLabel={t('FeedbackBodyLabel')}
        testID="error-report-body"
      />

      {outcome?.kind === 'failed' ? (
        <View testID="error-report-failure" className="gap-1">
          <Text className="text-error text-sm font-semibold">{t('FeedbackFailedTitle')}</Text>
          <Text className="text-description text-sm">
            {getFriendlyErrorMessage(t, outcome.error)}
          </Text>
          <Pressable
            onPress={openMail}
            accessibilityRole="button"
            testID="error-report-mailto"
            className="mt-1 self-start rounded-full border border-primary px-4 py-2"
          >
            <Text className="text-primary font-semibold">{t('FeedbackEmailLink')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={send}
        disabled={sending}
        accessibilityRole="button"
        testID="error-report-submit"
        className={`flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 ${
          sending ? 'opacity-60' : ''
        }`}
      >
        {sending ? <ActivityIndicator size="small" color={theme.background} /> : null}
        <Text style={{ color: theme.background }} className="font-semibold">
          {sending ? t('FeedbackSubmitting') : t('FeedbackSubmit')}
        </Text>
      </Pressable>
    </View>
  );
}
