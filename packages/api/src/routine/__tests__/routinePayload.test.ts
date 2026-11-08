import { describe, expect, it } from 'vitest';
import type { Routine } from '@beyou/types/routine/routine';
import { buildRoutinePayload } from '../routinePayload';

const EDIT = { includeSectionIds: true, includeGroupIds: true };

const daily = (): Routine => ({
    id: 'r1',
    name: 'Weekend',
    iconId: '',
    type: 'DAILY',
    routineSections: [
        {
            id: 's1',
            name: 'Morning',
            iconId: '',
            startTime: '08:00',
            endTime: '10:00',
            order: 0,
            habitGroup: [
                { id: 'g1', habitId: 'h1', startTime: '08:00', endTime: '08:30', days: ['Saturday'] },
                { id: 'g2', habitId: 'h2', startTime: '08:30', endTime: '09:00' },
            ],
            taskGroup: [
                { id: 'g3', taskId: 't1', startTime: '09:00', endTime: '09:30', days: [] },
            ],
        },
    ],
});

describe('buildRoutinePayload days', () => {
    it('sends the days a section item has', () => {
        const body = buildRoutinePayload(daily(), EDIT) as { routineSections: Array<{ habitGroup: Array<Record<string, unknown>>; taskGroup: Array<Record<string, unknown>> }> };
        expect(body.routineSections[0].habitGroup[0].days).toEqual(['Saturday']);
    });

    it('sends an empty array as is, because that is how an item is cleared', () => {
        const body = buildRoutinePayload(daily(), EDIT) as { routineSections: Array<{ taskGroup: Array<Record<string, unknown>> }> };
        expect(body.routineSections[0].taskGroup[0].days).toEqual([]);
    });

    it('leaves days out for an item that never had the field, so the server keeps what it stored', () => {
        const body = buildRoutinePayload(daily(), EDIT) as { routineSections: Array<{ habitGroup: Array<Record<string, unknown>> }> };
        expect('days' in body.routineSections[0].habitGroup[1]).toBe(false);
    });

    it('carries days on LIST items too', () => {
        const list: Routine = {
            id: 'r2',
            name: 'List',
            iconId: '',
            type: 'LIST',
            routineSections: [],
            items: [
                { id: 'a', type: 'HABIT', habitId: 'h1', orderIndex: 0, days: ['Monday', 'Friday'] },
                { id: 'b', type: 'TASK', taskId: 't1', orderIndex: 1 },
            ],
        };
        const body = buildRoutinePayload(list, EDIT) as { items: Array<Record<string, unknown>> };
        expect(body.items[0].days).toEqual(['Monday', 'Friday']);
        expect('days' in body.items[1]).toBe(false);
    });
});
