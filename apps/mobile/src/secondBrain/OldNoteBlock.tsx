import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Block from './Block';

/** How keeping a line went. `full` is the profile at its cap, which the block explains in place. */
export type OldNoteKeepOutcome = 'ok' | 'full' | 'error';

type OldNoteBlockProps = {
  /** The old note, one sentence per line, exactly as the server sent them. */
  lines: string[];
  onKeep: (line: string) => Promise<OldNoteKeepOutcome>;
  /** Each resolves true when the server kept the change. On false the caller has toasted. */
  onDiscard: (line: string) => Promise<boolean>;
  onClear: () => Promise<boolean>;
};

/**
 * The note the assistant used to keep out of sight, shown so the person can decide on each
 * line: keep it in the profile or drop it. Until they do, it still goes with every
 * conversation, and the heading says so. The phone twin of the web's OldNoteBlock.
 *
 * "Delete all" asks first with the system dialog, as clearing every conversation does: one
 * tap there wipes lines the person has not read yet.
 */
export default function OldNoteBlock({ lines, onKeep, onDiscard, onClear }: OldNoteBlockProps) {
  const { t } = useTranslation();
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  if (lines.length === 0) return null;

  const keep = async (line: string) => {
    setBusyLine(line);
    const outcome = await onKeep(line);
    setBusyLine(null);
    setFull(outcome === 'full');
  };

  const discard = async (line: string) => {
    setBusyLine(line);
    const ok = await onDiscard(line);
    setBusyLine(null);
    if (ok) setFull(false);
  };

  const confirmClear = () => {
    Alert.alert(t('SecondBrainOldNoteClearTitle'), t('SecondBrainOldNoteClearBody'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => void onClear() },
    ]);
  };

  return (
    <Block
      title={t('SecondBrainOldNoteTitle')}
      hint={t('SecondBrainOldNoteHint')}
      testID="second-brain-old-note"
      action={
        <Pressable
          onPress={confirmClear}
          accessibilityRole="button"
          hitSlop={8}
          className="py-1"
          testID="second-brain-old-note-clear"
        >
          <Text className="text-[13px] font-semibold text-text-2">{t('SecondBrainOldNoteClear')}</Text>
        </Pressable>
      }
    >
      <View>
        {/* The index too: nothing stops the old note from saying the same thing twice. */}
        {lines.map((line, index) => (
          <View
            key={`${index}:${line}`}
            className={`py-3 ${index > 0 ? 'border-t border-border' : 'pt-0'}`}
            testID="second-brain-old-note-line"
          >
            <Text className="text-sm leading-5 text-text">{line}</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              <Button
                text={t('SecondBrainOldNoteKeep')}
                mode="tonal"
                size="auto"
                disabled={busyLine !== null}
                submitting={busyLine === line}
                onPress={() => void keep(line)}
                testID="second-brain-old-note-keep"
              />
              <Button
                text={t('Delete')}
                mode="ghost"
                size="auto"
                disabled={busyLine !== null}
                onPress={() => void discard(line)}
                testID="second-brain-old-note-discard"
              />
            </View>
          </View>
        ))}
      </View>
      {full ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-[13px] leading-[18px] text-text-2" testID="second-brain-old-note-full">
          {t('SECOND_BRAIN_FACT_LIMIT_REACHED')}
        </Text>
      ) : null}
    </Block>
  );
}
