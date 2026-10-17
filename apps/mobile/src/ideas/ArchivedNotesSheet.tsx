import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArchiveRestore, Trash2 } from 'lucide-react-native';
import { noteColors } from '@beyou/state';
import type { QuickNote } from '@beyou/types/quickNote/quickNote';
import BottomSheet from '../ui/BottomSheet';
import Chip from '../ui/Chip';
import DeleteModal from '../ui/DeleteModal';
import IconButton from '../ui/IconButton';
import { useBeyouTheme } from '../theme/ThemeProvider';
import PillButton from './PillButton';

interface ArchivedNotesSheetProps {
  visible: boolean;
  /** Null until the list was fetched once. */
  notes: QuickNote[] | null;
  onClose: () => void;
  /** Fetched every time the sheet opens: the web or the assistant may have archived since. */
  onOpen: () => Promise<void>;
  onRestore: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

/** How much of a note the delete confirmation quotes. */
const QUOTE_MAX = 80;
const quote = (text: string) => (text.length > QUOTE_MAX ? `${text.slice(0, QUOTE_MAX - 1).trimEnd()}…` : text);

/**
 * Notes taken off the board: put one back, or delete it for good. A note that became a task
 * says so.
 *
 * Deleting asks first, and the question REPLACES the sheet instead of opening over it: two
 * native windows stacked is where Android drops taps (the calendar's task sheet does the same).
 */
export default function ArchivedNotesSheet({
  visible,
  notes,
  onClose,
  onOpen,
  onRestore,
  onDelete,
}: ArchivedNotesSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const paints = useMemo(() => noteColors(theme.base), [theme.base]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<QuickNote | null>(null);
  const inFlight = useRef(false);

  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setConfirm(null);
    setLoading(true);
    void onOpenRef.current().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  if (!visible) return null;

  const act = async (id: string, action: (id: string) => Promise<boolean>) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPendingId(id);
    const done = await action(id);
    inFlight.current = false;
    setPendingId(null);
    return done;
  };

  if (confirm) {
    return (
      <DeleteModal
        visible
        deletePhrase={t('IdeasDeleteConfirm')}
        name={quote(confirm.text)}
        pending={pendingId === confirm.id}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await act(confirm.id, onDelete);
          setConfirm(null);
        }}
        testID="ideas-delete-modal"
      />
    );
  }

  return (
    <BottomSheet visible onClose={onClose} dismissable={pendingId === null}>
      <View className="flex-shrink gap-3" testID="ideas-archived-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
          {t('IdeasArchived')}
        </Text>

        {notes === null && loading ? (
          <View className="items-center py-6" testID="ideas-archived-loading">
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : notes === null || notes.length === 0 ? (
          <Text className="py-4 text-center text-[13px] text-text-3" testID="ideas-archived-empty">
            {t('IdeasArchivedEmpty')}
          </Text>
        ) : (
          <ScrollView
            className="flex-shrink"
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {notes.map((note) => {
              const paint = paints[note.color];
              return (
                <View
                  key={note.id}
                  className="flex-row items-start gap-3 rounded-card border border-border bg-surface p-3"
                  testID={`ideas-archived-${note.id}`}
                >
                  <View
                    className="mt-0.5 h-4 w-4 rounded-full"
                    style={{ backgroundColor: paint.paper, borderColor: paint.edge, borderWidth: 1.5 }}
                    accessibilityLabel={t(`IdeasColor_${note.color}`)}
                  />
                  <View className="min-w-0 flex-1 gap-2">
                    <Text className="text-[13.5px] text-text" numberOfLines={4}>
                      {note.text}
                    </Text>
                    {note.convertedTaskId ? (
                      <Chip variant="ok" size="sm" testID={`ideas-archived-task-${note.id}`}>
                        {t('IdeasBecameTask')}
                      </Chip>
                    ) : null}
                    <View className="flex-row items-center gap-2">
                      <PillButton
                        label={t('IdeasRestore')}
                        tone="accent"
                        icon={<ArchiveRestore size={15} color={theme.accent} />}
                        busy={pendingId === note.id}
                        disabled={pendingId !== null}
                        onPress={() => void act(note.id, onRestore)}
                        testID={`ideas-restore-${note.id}`}
                      />
                      <IconButton
                        label={t('IdeasDeleteForever')}
                        tone="danger"
                        className="h-9 w-9"
                        disabled={pendingId !== null}
                        onPress={() => setConfirm(note)}
                        testID={`ideas-delete-${note.id}`}
                      >
                        <Trash2 size={16} color={theme.danger} />
                      </IconButton>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
