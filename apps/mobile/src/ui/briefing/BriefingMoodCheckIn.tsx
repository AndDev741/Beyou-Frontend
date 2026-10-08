import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Smile } from 'lucide-react-native';
import { saveMoodEntry, setMoodLevel } from '@beyou/api/mood/moodApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { MOOD_LEVELS, moodLabelKey, upsertMoodEntry } from '@beyou/state';
import { MAX_MOOD_NOTE_LENGTH, type MoodEntry, type MoodLevel } from '@beyou/types/mood/mood';
import { MOOD_FACES } from '../mood/moodScale';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';

interface Props {
  /** The account's today, from the briefing, so the entry lands on the day the server means. */
  date: string;
  /** Today's entry if one exists, from the shared mood slice. */
  entry: MoodEntry | undefined;
  /** True until today's entry has been read. Nothing is written before then. */
  loading: boolean;
}

/**
 * The native twin of the web's `MoodCheckIn`: "How are you today?" inside the morning sheet.
 *
 * Same two writes as the dashboard widget. A face is a PATCH that cannot touch the journal;
 * the note is a PUT, offered only once today's entry has been read and prefilled with what is
 * already there, so a quick line typed here cannot replace a longer entry written elsewhere.
 */
export default function BriefingMoodCheckIn({ date, entry, loading }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { theme } = useBeyouTheme();
  const [saving, setSaving] = useState(false);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');

  const pick = async (mood: MoodLevel) => {
    if (saving || loading) return;
    setSaving(true);
    const response = await setMoodLevel(date, mood, t);
    setSaving(false);
    if (response.success) {
      dispatch(upsertMoodEntry(response.success));
      return;
    }
    notify.error(getFriendlyErrorMessage(t, response.error));
  };

  const startWriting = () => {
    setDraft(entry?.note ?? '');
    setWriting(true);
  };

  const saveNote = async () => {
    if (!entry || saving) return;
    setSaving(true);
    const trimmed = draft.trim();
    const response = await saveMoodEntry(
      date,
      { mood: entry.mood, note: trimmed === '' ? null : trimmed },
      t,
    );
    setSaving(false);
    if (response.success) {
      dispatch(upsertMoodEntry(response.success));
      setWriting(false);
      notify.success(t('MoodJournalSaved'));
      return;
    }
    notify.error(getFriendlyErrorMessage(t, response.error));
  };

  return (
    <View className="mt-5" testID="briefing-mood-today">
      <View className="flex-row items-center gap-2">
        <Smile size={14} color={theme.text3} />
        <Text className="text-xs font-semibold text-text-2">{t('HowAreYouToday')}</Text>
      </View>

      <View className="mt-2.5 flex-row items-center" style={{ gap: 8 }}>
        {MOOD_LEVELS.map((level) => {
          const { Icon, color } = MOOD_FACES[level];
          const chosen = entry?.mood === level;
          return (
            <Pressable
              key={level}
              onPress={() => pick(level)}
              disabled={saving || loading}
              accessibilityRole="button"
              accessibilityLabel={t(moodLabelKey(level))}
              accessibilityState={{ selected: chosen, disabled: saving || loading }}
              testID={`briefing-mood-face-${level}`}
              className={`h-10 w-10 items-center justify-center rounded-full border ${
                chosen ? 'border-transparent bg-surface-2' : 'border-border'
              }`}
            >
              <Icon size={20} color={color(theme)} />
            </Pressable>
          );
        })}
      </View>

      {entry && !writing ? (
        <Pressable
          onPress={startWriting}
          accessibilityRole="button"
          testID="briefing-mood-note-toggle"
          className="mt-2 self-start py-1"
        >
          <Text className="text-xs font-medium text-accent">
            {entry.note ? t('BriefingMoodEditNote') : t('BriefingMoodAddNote')}
          </Text>
        </Pressable>
      ) : null}

      {entry && writing ? (
        <View className="mt-2.5">
          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, MAX_MOOD_NOTE_LENGTH))}
            placeholder={t('MoodJournalPlaceholder')}
            placeholderTextColor={theme.text3}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('MoodJournalTitle')}
            testID="briefing-mood-note"
            className="min-h-[88px] rounded-control border border-border bg-bg p-3 text-sm text-text"
          />
          <View className="mt-2 flex-row justify-end" style={{ gap: 8 }}>
            <Pressable
              onPress={() => setWriting(false)}
              accessibilityRole="button"
              className="rounded-control px-3 py-2"
            >
              <Text className="text-xs font-semibold text-text-3">{t('Cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={saveNote}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              testID="briefing-mood-note-save"
              className="rounded-control bg-accent-soft px-3 py-2"
            >
              <Text className="text-xs font-semibold text-accent">{t('MoodJournalSave')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
