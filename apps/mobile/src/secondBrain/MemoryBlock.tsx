import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react-native';
import {
  secondBrainGroupHeading,
  secondBrainNoteDate,
  secondBrainNoteOriginLabel,
  secondBrainSubjectKey,
  secondBrainSubjectLabel,
} from '@beyou/state';
import {
  SECOND_BRAIN_NOTE_TEXT_MAX,
  type SecondBrainMemoryGroup,
  type SecondBrainMemorySubject,
  type SecondBrainNote,
} from '@beyou/types/secondBrain/secondBrain';
import BeyouIcon from '../ui/BeyouIcon';
import Chip from '../ui/Chip';
import IconButton from '../ui/IconButton';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';
import LineForm from './LineForm';

type MemoryBlockProps = {
  memory: SecondBrainMemoryGroup[];
  /** Each resolves true when the server kept the change. On false the caller has toasted. */
  onEdit: (id: string, text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

type NoteActions = {
  editingId: string | null;
  removingId: string | null;
  startEdit: (id: string) => void;
  stopEdit: () => void;
  onEdit: (id: string, text: string) => Promise<boolean>;
  remove: (id: string) => void;
};

/** One dated line on a thing's timeline, with where it came from. */
function NoteRow({ note, actions }: { note: SecondBrainNote; actions: NoteActions }) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  if (actions.editingId === note.id) {
    return (
      <View className="py-1.5">
        <LineForm
          initial={note.text}
          label={t('SecondBrainNoteEditLabel')}
          maxLength={SECOND_BRAIN_NOTE_TEXT_MAX}
          formTestID="second-brain-note-form"
          inputTestID="second-brain-note-input"
          saveTestID="second-brain-note-save"
          cancelTestID="second-brain-note-cancel"
          onCancel={actions.stopEdit}
          onSave={async (text) => {
            const ok = await actions.onEdit(note.id, text);
            if (ok) actions.stopEdit();
            return ok;
          }}
        />
      </View>
    );
  }

  const origin = secondBrainNoteOriginLabel(note.origin);
  return (
    <View className="flex-row items-start gap-1 py-1.5" testID="second-brain-note">
      {/* The dot sits on the line the list draws down its left edge. */}
      <View className="absolute h-2 w-2 rounded-full bg-text-3" style={{ left: -16.5, top: 13 }} />
      <View className="min-w-0 flex-1 pt-0.5">
        <Text className="text-[11.5px] text-text-3">
          <Text className="font-mono text-[11.5px] text-text-3">{secondBrainNoteDate(note.createdAt, i18n.language)}</Text>
          {origin ? <Text testID="second-brain-note-origin">{` · ${t(origin)}`}</Text> : null}
        </Text>
        <Text className="mt-0.5 text-sm leading-5 text-text">{note.text}</Text>
      </View>
      <IconButton
        label={t('Edit')}
        onPress={() => actions.startEdit(note.id)}
        testID={`second-brain-note-edit-${note.id}`}
      >
        <Pencil size={15} color={theme.text3} />
      </IconButton>
      <IconButton
        label={t('Delete')}
        tone="danger"
        disabled={actions.removingId === note.id}
        onPress={() => actions.remove(note.id)}
        testID={`second-brain-note-delete-${note.id}`}
      >
        <Trash2 size={15} color={theme.text3} />
      </IconButton>
    </View>
  );
}

/** One thing and its timeline. A deleted thing says so, since its name alone would not. */
function SubjectCard({ subject, actions }: { subject: SecondBrainMemorySubject; actions: NoteActions }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const label = secondBrainSubjectLabel(subject);
  return (
    <View className="rounded-control border border-border bg-bg px-3.5 py-3" testID="second-brain-memory-subject">
      <View className="flex-row items-center gap-2">
        <BeyouIcon id={subject.iconId} size={15} color={theme.text2} />
        <Text accessibilityRole="header" className="shrink text-sm font-semibold text-text" numberOfLines={1}>
          {subject.name}
        </Text>
        {label ? (
          label.deleted ? (
            <Chip size="sm" testID="second-brain-memory-deleted">
              {t(label.key)}
            </Chip>
          ) : (
            <Text className="shrink-0 text-[11.5px] text-text-3">{t(label.key)}</Text>
          )
        ) : null}
      </View>
      <View className="ml-1 mt-2 border-l border-border pl-3">
        {subject.notes.map((note) => (
          <NoteRow key={note.id} note={note} actions={actions} />
        ))}
      </View>
    </View>
  );
}

function MemoryGroup({ group, actions }: { group: SecondBrainMemoryGroup; actions: NoteActions }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const heading = secondBrainGroupHeading(group);
  return (
    <View testID="second-brain-memory-group">
      <View className="flex-row items-center gap-2">
        {'name' in heading ? <BeyouIcon id={group.categoryIconId} size={14} color={theme.text2} /> : null}
        <Text accessibilityRole="header" className="shrink text-[13px] font-semibold text-text-2" numberOfLines={1}>
          {'name' in heading ? heading.name : t(heading.key)}
        </Text>
      </View>
      <View className="mt-2.5 gap-2.5">
        {group.subjects.map((subject) => (
          <SubjectCard key={secondBrainSubjectKey(subject)} subject={subject} actions={actions} />
        ))}
      </View>
    </View>
  );
}

/**
 * What Beyou keeps about the things a person tracks: dated notes on habits, goals, routines
 * and categories, grouped by category, each thing's notes oldest first so a change reads as
 * the next line of a story. The phone twin of the web's MemoryBlock.
 *
 * Answers and the assistant write here; the person corrects and deletes. A note is deleted
 * at once, like a profile line.
 */
export default function MemoryBlock({ memory, onEdit, onDelete }: MemoryBlockProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const actions: NoteActions = {
    editingId,
    removingId,
    startEdit: setEditingId,
    stopEdit: () => setEditingId(null),
    onEdit,
    remove: (id) => {
      setRemovingId(id);
      void onDelete(id).finally(() => setRemovingId(null));
    },
  };

  return (
    <Block
      title={t('SecondBrainMemoryTitle')}
      hint={memory.length > 0 ? t('SecondBrainMemoryHint') : undefined}
      testID="second-brain-memory"
    >
      {memory.length === 0 ? (
        <Text className="text-sm leading-[21px] text-text-2" testID="second-brain-memory-empty">
          {t('SecondBrainMemoryEmpty')}
        </Text>
      ) : (
        <View className="gap-5">
          {memory.map((group) => (
            <MemoryGroup key={group.categoryId ?? 'other'} group={group} actions={actions} />
          ))}
        </View>
      )}
    </Block>
  );
}
