import type {
    SecondBrainArea,
    SecondBrainMemoryGroup,
    SecondBrainMemorySubject,
    SecondBrainNote,
} from '@beyou/types/secondBrain/secondBrain';
import {
    SECOND_BRAIN_MEMORY_OTHER_GROUP,
    SECOND_BRAIN_QUESTION_LABEL,
    SECOND_BRAIN_REFILL_EVERY_MS,
    canActOnAnswer,
    secondBrainAnswerLeftNotes,
    secondBrainAreaEnds,
    secondBrainFactOriginLabel,
    secondBrainGroupHeading,
    secondBrainMemoryWithNote,
    secondBrainMemoryWithoutNote,
    secondBrainNoteCount,
    secondBrainNoteDate,
    secondBrainNoteOriginLabel,
    secondBrainRefillIsDue,
    secondBrainSourceEnabled,
    secondBrainSubjectKey,
    secondBrainSubjectLabel,
} from './secondBrainRules';

const area = (categoryId: string, percent: number | null): SecondBrainArea => ({
    categoryId,
    name: categoryId,
    iconId: null,
    asked: 10,
    checked: percent == null ? 0 : Math.round(percent / 10),
    percent,
});

describe('secondBrainAreaEnds', () => {
    it('names the first and the last category that have a percentage', () => {
        expect(secondBrainAreaEnds([area('health', 83), area('work', 50), area('study', 30), area('new', null)]))
            .toEqual({ strongestId: 'health', weakestId: 'study' });
    });

    /** One category, or every category level, has no two ends to tell apart. */
    it('names nothing without two different ends', () => {
        expect(secondBrainAreaEnds([area('health', 83)])).toBeNull();
        expect(secondBrainAreaEnds([area('health', 0), area('work', 0)])).toBeNull();
        expect(secondBrainAreaEnds([area('health', 60), area('new', null)])).toBeNull();
        expect(secondBrainAreaEnds([])).toBeNull();
    });
});

describe('secondBrainRefillIsDue', () => {
    const now = 1_800_000_000_000;

    it('always asks for an empty list, however recently it asked', () => {
        expect(secondBrainRefillIsDue(0, now - 1000, now)).toBe(true);
    });

    it('never asks for a full list', () => {
        expect(secondBrainRefillIsDue(5, null, now)).toBe(false);
    });

    it('asks again only after the pause', () => {
        expect(secondBrainRefillIsDue(2, null, now)).toBe(true);
        expect(secondBrainRefillIsDue(2, now - SECOND_BRAIN_REFILL_EVERY_MS, now)).toBe(false);
        expect(secondBrainRefillIsDue(2, now - SECOND_BRAIN_REFILL_EVERY_MS - 1, now)).toBe(true);
    });
});

describe('answers and sources', () => {
    /** A profile answer is the fact itself. The others may call for something done in the app. */
    it('hands only check-ins and follow-ups to the assistant', () => {
        expect(canActOnAnswer('CHECK_IN')).toBe(true);
        expect(canActOnAnswer('FOLLOW_UP')).toBe(true);
        expect(canActOnAnswer('PROFILE_OBJECTIVES')).toBe(false);
        expect(canActOnAnswer('PROFILE_LIKES')).toBe(false);
        expect(canActOnAnswer('PROFILE_ABOUT')).toBe(false);
    });

    it('reads a source the list does not carry as off', () => {
        const sources = [{ source: 'GOALS' as const, enabled: true }, { source: 'CALENDAR' as const, enabled: false }];
        expect(secondBrainSourceEnabled(sources, 'GOALS')).toBe(true);
        expect(secondBrainSourceEnabled(sources, 'CALENDAR')).toBe(false);
        expect(secondBrainSourceEnabled(sources, 'IDEAS')).toBe(false);
    });
});

describe('the questions about something new', () => {
    /** Asked why a thing started, the answer is a note, not something to do in the app. */
    it('never offers a new-thing answer to the assistant', () => {
        expect(canActOnAnswer('NEW_THING')).toBe(false);
    });

    it('has a label of its own', () => {
        expect(SECOND_BRAIN_QUESTION_LABEL.NEW_THING).toBe('SecondBrainQuestionKindNewThing');
    });
});

describe('where a line came from', () => {
    it('labels every profile origin but the one the person typed', () => {
        expect(secondBrainFactOriginLabel('USER')).toBeNull();
        expect(secondBrainFactOriginLabel('ANSWER')).toBe('SecondBrainFactFromAnswer');
        expect(secondBrainFactOriginLabel('ASSISTANT')).toBe('SecondBrainFromAssistant');
        expect(secondBrainFactOriginLabel('OLD_NOTE')).toBe('SecondBrainFactFromOldNote');
    });

    /** In a timeline that mixes the three, a note with no label would read as "unknown". */
    it('labels every note origin, the person typing included', () => {
        expect(secondBrainNoteOriginLabel('USER')).toBe('SecondBrainNoteFromYou');
        expect(secondBrainNoteOriginLabel('ANSWER')).toBe('SecondBrainFactFromAnswer');
        expect(secondBrainNoteOriginLabel('ASSISTANT')).toBe('SecondBrainFromAssistant');
    });

    /** A newer server adding an origin must not put a raw key on the page. */
    it('says nothing about an origin it does not know', () => {
        expect(secondBrainFactOriginLabel('IMPORTED' as never)).toBeNull();
        expect(secondBrainNoteOriginLabel('IMPORTED' as never)).toBeNull();
    });
});

describe('the memory block', () => {
    const note = (id: string, text = id): SecondBrainNote => ({
        id,
        text,
        origin: 'ANSWER',
        subjectName: 'Gym',
        createdAt: '2026-11-21T10:00:00Z',
        updatedAt: '2026-11-21T10:00:00Z',
    });
    const subject = (patch: Partial<SecondBrainMemorySubject>): SecondBrainMemorySubject => ({
        type: 'HABIT',
        id: 'h1',
        name: 'Gym',
        iconId: null,
        formerType: null,
        notes: [],
        ...patch,
    });
    const memory = (): SecondBrainMemoryGroup[] => [
        {
            categoryId: 'c1',
            categoryName: 'Health',
            categoryIconId: null,
            subjects: [
                subject({ type: 'CATEGORY', id: 'c1', name: 'Health', notes: [note('n1')] }),
                subject({ notes: [note('n2'), note('n3')] }),
            ],
        },
        {
            categoryId: null,
            categoryName: null,
            categoryIconId: null,
            subjects: [subject({ type: 'ROUTINE', id: 'r1', name: 'Morning', notes: [note('n4')] })],
        },
    ];

    it('tags a thing that was deleted with what it was', () => {
        expect(secondBrainSubjectLabel({ type: 'CATEGORY', formerType: 'HABIT' })).toEqual({
            key: 'SecondBrainSubjectDeletedHabit',
            deleted: true,
        });
        expect(secondBrainSubjectLabel({ type: 'LOOSE', formerType: 'ROUTINE' })).toEqual({
            key: 'SecondBrainSubjectDeletedRoutine',
            deleted: true,
        });
        expect(secondBrainSubjectLabel({ type: 'CATEGORY', formerType: 'GOAL' })?.key).toBe(
            'SecondBrainSubjectDeletedGoal',
        );
    });

    /** A deleted category's notes have nowhere to go and no former type to name. */
    it('still tags a loose subject as deleted when it does not say what it was', () => {
        expect(secondBrainSubjectLabel({ type: 'LOOSE', formerType: null })).toEqual({
            key: 'SecondBrainSubjectDeleted',
            deleted: true,
        });
    });

    it('names the kind of a thing that still exists', () => {
        expect(secondBrainSubjectLabel({ type: 'HABIT', formerType: null })).toEqual({
            key: 'SecondBrainSubjectHabit',
            deleted: false,
        });
        expect(secondBrainSubjectLabel({ type: 'CATEGORY', formerType: null })?.key).toBe('SecondBrainSubjectCategory');
    });

    it('heads a group with its category, and the rest with the shared label', () => {
        const [health, rest] = memory();
        expect(secondBrainGroupHeading(health)).toEqual({ name: 'Health' });
        expect(secondBrainGroupHeading(rest)).toEqual({ key: SECOND_BRAIN_MEMORY_OTHER_GROUP });
    });

    /** A category's own notes and the notes a deleted habit left on it share the category id. */
    it('keeps a category apart from the deleted thing filed under it', () => {
        const own = subject({ type: 'CATEGORY', id: 'c1', name: 'Health' });
        const moved = subject({ type: 'CATEGORY', id: 'c1', name: 'Gym', formerType: 'HABIT' });
        expect(secondBrainSubjectKey(own)).not.toBe(secondBrainSubjectKey(moved));
    });

    it('counts every note', () => {
        expect(secondBrainNoteCount(memory())).toBe(4);
        expect(secondBrainNoteCount([])).toBe(0);
    });

    it('puts an edited note back in its place', () => {
        const edited = { ...note('n2', 'Rain stops me'), origin: 'ASSISTANT' as const };
        const next = secondBrainMemoryWithNote(memory(), edited);
        expect(next[0].subjects[1].notes.map((item) => item.text)).toEqual(['Rain stops me', 'n3']);
        expect(next[0].subjects[1].notes[0].origin).toBe('ASSISTANT');
        expect(next[1]).toEqual(memory()[1]);
    });

    /** The server sends no empty subject and no empty group, so the page should not keep one. */
    it('drops a subject and a group once their last note is deleted', () => {
        let next = secondBrainMemoryWithoutNote(memory(), 'n2');
        expect(next[0].subjects[1].notes.map((item) => item.id)).toEqual(['n3']);

        next = secondBrainMemoryWithoutNote(next, 'n3');
        expect(next[0].subjects).toHaveLength(1);

        next = secondBrainMemoryWithoutNote(next, 'n4');
        expect(next).toHaveLength(1);
        expect(next[0].categoryId).toBe('c1');
    });

    it('reads the page again only when an answer left notes', () => {
        expect(secondBrainAnswerLeftNotes({ notes: [note('n9')] })).toBe(true);
        expect(secondBrainAnswerLeftNotes({ notes: [] })).toBe(false);
        // A server older than the notes sends no such field.
        expect(secondBrainAnswerLeftNotes({} as never)).toBe(false);
    });

    it('writes a note date in the reader language, and nothing for a date it cannot read', () => {
        expect(secondBrainNoteDate('2026-11-21T10:00:00Z', 'en')).toMatch(/2026/);
        expect(secondBrainNoteDate('2026-11-21T10:00:00Z', 'pt')).toMatch(/nov/i);
        expect(secondBrainNoteDate('not a date', 'en')).toBe('');
    });
});
