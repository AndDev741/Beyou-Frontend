import { memo } from 'react';
import { StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NotePaint } from '@beyou/state';
import {
  QUICK_NOTE_HEIGHT,
  QUICK_NOTE_WIDTH,
  type QuickNote,
} from '@beyou/types/quickNote/quickNote';

/**
 * A post-it as the board draws it, in board units: the board layer scales the whole lot, so a
 * note never re-renders for a zoom or a pan.
 */
export function NoteFace({ text, paint }: { text: string; paint: NotePaint }) {
  return (
    <View style={[styles.face, { backgroundColor: paint.paper, borderColor: paint.edge }]}>
      <View style={[styles.strip, { backgroundColor: paint.edge }]} />
      <Text style={[styles.text, { color: paint.ink }]} numberOfLines={6}>
        {text}
      </Text>
    </View>
  );
}

interface QuickNoteCardProps {
  note: QuickNote;
  paint: NotePaint;
  /** The note is being dragged: its stand-in moves, this one keeps the spot empty. */
  hidden: boolean;
  onActivate: (id: string) => void;
}

/**
 * One note on the board, placed where the server says.
 *
 * It takes no touches (the board reads every finger itself, see useBoardGestures), so a screen
 * reader opens it through the standard `activate` action: double tap on Android and iOS alike.
 * Memoised: with 200 notes on the board, a drag or an edit re-renders the one that changed.
 */
function QuickNoteCard({ note, paint, hidden, onActivate }: QuickNoteCardProps) {
  const { t } = useTranslation();
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate') onActivate(note.id);
  };
  return (
    <View
      style={[styles.placed, { left: note.x, top: note.y, opacity: hidden ? 0 : 1 }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('IdeasNoteLabel', { text: note.text })}
      accessibilityHint={t('IdeasDragHint')}
      accessibilityActions={[{ name: 'activate', label: t('IdeasEdit') }]}
      onAccessibilityAction={onAccessibilityAction}
      testID={`ideas-note-${note.id}`}
    >
      <NoteFace text={note.text} paint={paint} />
    </View>
  );
}

export default memo(QuickNoteCard);

const styles = StyleSheet.create({
  placed: { position: 'absolute', width: QUICK_NOTE_WIDTH, height: QUICK_NOTE_HEIGHT },
  face: {
    width: QUICK_NOTE_WIDTH,
    height: QUICK_NOTE_HEIGHT,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  strip: { height: 10 },
  text: { paddingHorizontal: 12, paddingTop: 8, fontSize: 15, lineHeight: 20, fontFamily: 'Geist' },
});
