import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Archive, Check, ListPlus } from 'lucide-react-native';
import { noteColors } from '@beyou/state';
import {
  QUICK_NOTE_COLORS,
  QUICK_NOTE_TEXT_MAX,
  type QuickNote,
  type QuickNoteColor,
} from '@beyou/types/quickNote/quickNote';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import Input from '../ui/Input';
import FieldLabel from '../ui/form/FieldLabel';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface QuickNoteSheetProps {
  /** The note being edited; the sheet is closed while null. */
  note: QuickNote | null;
  onClose: () => void;
  /** Resolves true when the edit landed (or the note turned out gone), which closes the sheet. */
  onSave: (id: string, text: string, color: QuickNoteColor) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
  /** Hands over to the task form, with the text as it stands in the sheet. */
  onMakeTask: (note: QuickNote, text: string) => void;
}

/** Text under this many characters left shows the countdown. */
const COUNTDOWN_FROM = 60;

/**
 * Open a note: change its words and colour, turn it into a task, or take it off the board.
 * Mounted while a note is open, so it always starts from that note's own text.
 */
export default function QuickNoteSheet({ note, onClose, onSave, onArchive, onMakeTask }: QuickNoteSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const paints = useMemo(() => noteColors(theme.base), [theme.base]);
  const [text, setText] = useState(note?.text ?? '');
  const [color, setColor] = useState<QuickNoteColor>(note?.color ?? 'YELLOW');
  const [busy, setBusy] = useState<'save' | 'archive' | null>(null);
  // State lags a render; a second tap in the same frame would read `null`.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!note) return;
    setText(note.text);
    setColor(note.color);
  }, [note]);

  if (!note) return null;

  const trimmed = text.trim();
  const left = QUICK_NOTE_TEXT_MAX - text.length;

  const run = async (kind: 'save' | 'archive', action: () => Promise<boolean>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    const done = await action();
    inFlight.current = false;
    setBusy(null);
    if (done) onClose();
  };

  return (
    <BottomSheet visible onClose={onClose} dismissable={busy === null}>
      <View className="gap-4" testID="ideas-note-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
          {t('IdeasEdit')}
        </Text>

        <View>
          <Input
            compact
            multiline
            value={text}
            onChangeText={setText}
            maxLength={QUICK_NOTE_TEXT_MAX}
            accessibilityLabel={t('IdeasEdit')}
            testID="ideas-note-text"
          />
          {left <= COUNTDOWN_FROM ? (
            <Text className="mt-1 text-right font-mono text-[11px] text-text-3" testID="ideas-note-left">
              {t('IdeasCharsLeft', { count: left })}
            </Text>
          ) : null}
        </View>

        <View>
          <FieldLabel>{t('IdeasColor')}</FieldLabel>
          <View
            className="flex-row flex-wrap gap-2.5"
            accessibilityRole="radiogroup"
            accessibilityLabel={t('IdeasColor')}
          >
            {QUICK_NOTE_COLORS.map((option) => {
              const chosen = option === color;
              const paint = paints[option];
              return (
                <Pressable
                  key={option}
                  onPress={() => setColor(option)}
                  accessibilityRole="radio"
                  accessibilityLabel={t(`IdeasColor_${option}`)}
                  accessibilityState={{ checked: chosen, selected: chosen }}
                  testID={`ideas-color-${option}`}
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: paint.paper,
                    borderColor: chosen ? theme.accent : paint.edge,
                    borderWidth: chosen ? 2.5 : 1.5,
                  }}
                >
                  {chosen ? <Check size={18} color={paint.ink} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Button
            text={t('Save')}
            mode="primary"
            size="block"
            submitting={busy === 'save'}
            disabled={!trimmed || busy !== null}
            onPress={() => void run('save', () => onSave(note.id, trimmed, color))}
            testID="ideas-note-save"
          />
          <Button
            text={t('IdeasMakeTask')}
            mode="tonal"
            size="block"
            icon={<ListPlus size={16} color={theme.accent} />}
            disabled={!trimmed || busy !== null}
            onPress={() => onMakeTask(note, trimmed)}
            testID="ideas-note-make-task"
          />
          <Button
            text={t('IdeasArchive')}
            mode="ghost"
            size="block"
            icon={<Archive size={16} color={theme.text2} />}
            submitting={busy === 'archive'}
            disabled={busy !== null}
            onPress={() => void run('archive', () => onArchive(note.id))}
            testID="ideas-note-archive"
          />
        </View>
      </View>
    </BottomSheet>
  );
}
