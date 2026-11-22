import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import {
    secondBrainGroupHeading,
    secondBrainNoteDate,
    secondBrainNoteOriginLabel,
    secondBrainSubjectKey,
    secondBrainSubjectLabel,
} from "@beyou/state";
import {
    SECOND_BRAIN_NOTE_TEXT_MAX,
    type SecondBrainMemoryGroup,
    type SecondBrainMemorySubject,
    type SecondBrainNote,
} from "@beyou/types/secondBrain/secondBrain";
import BeyouIcon from "../../ui/BeyouIcon";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import Block from "./Block";
import LineForm from "./LineForm";

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

    if (actions.editingId === note.id) {
        return (
            <li className="py-1.5">
                <LineForm
                    initial={note.text}
                    label={t("SecondBrainNoteEditLabel")}
                    maxLength={SECOND_BRAIN_NOTE_TEXT_MAX}
                    rows={3}
                    formTestId="second-brain-note-form"
                    inputTestId="second-brain-note-input"
                    onCancel={actions.stopEdit}
                    onSave={async (text) => {
                        const ok = await actions.onEdit(note.id, text);
                        if (ok) actions.stopEdit();
                        return ok;
                    }}
                />
            </li>
        );
    }

    const origin = secondBrainNoteOriginLabel(note.origin);
    return (
        <li className="group relative flex items-start gap-2 py-1.5" data-testid="second-brain-note">
            {/* The dot sits on the line the list draws down its left edge. */}
            <span
                aria-hidden="true"
                className="absolute -left-[16.5px] top-[13px] h-2 w-2 rounded-full bg-text-3 ring-2 ring-bg"
            />
            <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-text-3">
                    <time dateTime={note.createdAt} className="font-mono">
                        {secondBrainNoteDate(note.createdAt, i18n.language)}
                    </time>
                    {origin && <span data-testid="second-brain-note-origin"> · {t(origin)}</span>}
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-snug text-text">{note.text}</p>
            </div>
            {/* Always there on touch screens, where nothing hovers. */}
            <div className="flex shrink-0 gap-0.5 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <IconButton label={t("Edit")} className="h-7 w-7" onClick={() => actions.startEdit(note.id)}>
                    <Pencil size={14} aria-hidden="true" />
                </IconButton>
                <IconButton
                    label={t("Delete")}
                    tone="danger"
                    className="h-7 w-7"
                    disabled={actions.removingId === note.id}
                    onClick={() => actions.remove(note.id)}
                >
                    <Trash2 size={14} aria-hidden="true" />
                </IconButton>
            </div>
        </li>
    );
}

/** One thing and its timeline. A deleted thing says so, since its name alone would not. */
function SubjectCard({ subject, actions }: { subject: SecondBrainMemorySubject; actions: NoteActions }) {
    const { t } = useTranslation();
    const label = secondBrainSubjectLabel(subject);
    return (
        <li className="rounded-control border border-border bg-bg px-3.5 py-3" data-testid="second-brain-memory-subject">
            <div className="flex min-w-0 items-center gap-2">
                <BeyouIcon id={subject.iconId} size={15} className="shrink-0 text-text-2" />
                <h4 className="min-w-0 truncate text-sm font-semibold text-text">{subject.name}</h4>
                {label &&
                    (label.deleted ? (
                        <span className="shrink-0" data-testid="second-brain-memory-deleted">
                            <Chip size="sm">{t(label.key)}</Chip>
                        </span>
                    ) : (
                        <span className="shrink-0 text-[11.5px] text-text-3">{t(label.key)}</span>
                    ))}
            </div>
            <ol className="ml-1 mt-2 border-l border-border pl-3">
                {subject.notes.map((note) => (
                    <NoteRow key={note.id} note={note} actions={actions} />
                ))}
            </ol>
        </li>
    );
}

function MemoryGroup({ group, actions }: { group: SecondBrainMemoryGroup; actions: NoteActions }) {
    const { t } = useTranslation();
    const headingId = useId();
    const heading = secondBrainGroupHeading(group);
    return (
        <section aria-labelledby={headingId} data-testid="second-brain-memory-group">
            <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-text-2">
                {"name" in heading && <BeyouIcon id={group.categoryIconId} size={14} className="shrink-0" />}
                <span className="truncate">{"name" in heading ? heading.name : t(heading.key)}</span>
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2.5">
                {group.subjects.map((subject) => (
                    <SubjectCard key={secondBrainSubjectKey(subject)} subject={subject} actions={actions} />
                ))}
            </ul>
        </section>
    );
}

/**
 * What Beyou keeps about the things a person tracks: dated notes on habits, goals, routines
 * and categories, grouped by category, each thing's notes oldest first so a change reads as
 * the next line of a story instead of replacing the last one.
 *
 * Answers and the assistant write here; the person corrects and deletes. There is no way to
 * add a note by hand, on purpose: that is the notebook's job.
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
            title={t("SecondBrainMemoryTitle")}
            hint={memory.length > 0 ? t("SecondBrainMemoryHint") : undefined}
            testId="second-brain-memory"
        >
            {memory.length === 0 ? (
                <p className="max-w-[56ch] text-sm leading-relaxed text-text-2" data-testid="second-brain-memory-empty">
                    {t("SecondBrainMemoryEmpty")}
                </p>
            ) : (
                <div className="flex flex-col gap-6">
                    {memory.map((group) => (
                        <MemoryGroup key={group.categoryId ?? "other"} group={group} actions={actions} />
                    ))}
                </div>
            )}
        </Block>
    );
}
