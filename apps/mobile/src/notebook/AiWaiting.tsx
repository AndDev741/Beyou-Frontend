import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_SLOW_AFTER_SECONDS, formatElapsed } from '@beyou/state';

/**
 * Seconds since `since` (an ISO time from the server), or since the component mounted when there
 * is none. A wait that began before this screen opened, like a draft reopened halfway through,
 * shows how long it has really been running. Never below zero, whatever the two clocks say.
 */
export function useElapsedSeconds(since?: string | null): number {
  const [mountedAt] = useState(() => Date.now());
  const parsed = since ? Date.parse(since) : NaN;
  const started = Number.isNaN(parsed) ? mountedAt : parsed;
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - started) / 1000)));
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started]);
  return seconds;
}

/**
 * What a notebook AI call shows while the person waits, as on the web: the label and how long it
 * has been, and once the call runs long, that the server is asking the model once more. A label
 * alone looks the same at second 3 and at second 70.
 */
export function AiWaitingLine({ label, since, slowNote = true }: { label: string; since?: string | null; slowNote?: boolean }) {
  const { t } = useTranslation();
  const seconds = useElapsedSeconds(since);
  return (
    <View className="gap-0.5" testID="ai-waiting">
      <Text className="text-[13px] text-text-2">
        {`${label} `}
        <Text className="font-mono text-[13px] text-text-2" testID="ai-waiting-elapsed">{formatElapsed(seconds)}</Text>
      </Text>
      {slowNote && seconds >= AI_SLOW_AFTER_SECONDS ? (
        <Text className="text-[12px] text-text-2" testID="ai-waiting-slow">{t('NotebookAiWaitSlow')}</Text>
      ) : null}
    </View>
  );
}
