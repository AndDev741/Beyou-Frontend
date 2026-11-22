import { describe, expect, it } from 'vitest';
import {
    FOCUS_TOOLS,
    KNOWN_TOOLS,
    READ_TOOLS,
    ROUTINE_ITEM_TOOLS,
    SECOND_BRAIN_TOOLS,
    isDiagramTool,
    isReadTool,
    toolDestination,
} from '../toolRegistry';

describe('the shared agent tool registry', () => {
    it('lists each known tool once, in one group only', () => {
        expect(new Set(KNOWN_TOOLS).size).toBe(KNOWN_TOOLS.length);
    });

    it('gives reads no destination, so they render as chips', () => {
        for (const tool of READ_TOOLS) {
            expect(isReadTool(tool)).toBe(true);
            expect(toolDestination(tool)).toBeNull();
        }
    });

    it('sends micro-task writes to the focus screen, never to the tasks page', () => {
        for (const tool of FOCUS_TOOLS) expect(toolDestination(tool)?.route).toBe('/focus');
    });

    it('sends a tool naming two entities to the routine it changed', () => {
        for (const tool of ROUTINE_ITEM_TOOLS) expect(toolDestination(tool)?.route).toBe('/routines');
    });

    it.each([
        ['createUserHabit', '/habits'],
        ['editUserCategory', '/categories'],
        ['deleteUserTask', '/tasks'],
        ['moveUserGoalUnder', '/goals'],
        ['createUserSchedule', '/routines'],
        ['logUserMood', '/mood'],
        ['addStudyNode', '/notebook'],
        ['updateUserConfiguration', '/configuration'],
        ['createQuickNote', '/ideas'],
        ['createCalendarTask', '/calendar'],
        ['editCalendarTask', '/calendar'],
        ['completeCalendarTask', '/calendar'],
        ['deleteCalendarTask', '/calendar'],
    ])('sends %s to %s', (tool, route) => {
        expect(toolDestination(tool)?.route).toBe(route);
    });

    it('shows reading the calendar as a chip', () => {
        expect(isReadTool('getCalendar')).toBe(true);
        expect(toolDestination('getCalendar')).toBeNull();
    });

    it('shows reading the ideas board as a chip', () => {
        expect(isReadTool('getQuickNotes')).toBe(true);
        expect(toolDestination('getQuickNotes')).toBeNull();
    });

    // The cycle reads used to fall through to /Study/ and render as write cards linking to the
    // notebook, as if reading today's plan had changed something there.
    it.each(['getStudyToday', 'listStudyCycles', 'getStudyCycle', 'listStudySessions'])('shows the cycle read %s as a chip', (tool) => {
        expect(isReadTool(tool)).toBe(true);
    });

    it('treats the diagram tools as diagrams: show saves nothing, add points at the notebook', () => {
        expect(isDiagramTool('showDiagram')).toBe(true);
        expect(isDiagramTool('addStudyDiagram')).toBe(true);
        expect(isDiagramTool('addStudyNotes')).toBe(false);
        expect(isReadTool('showDiagram')).toBe(true);
        expect(toolDestination('showDiagram')).toBeNull();
        expect(toolDestination('addStudyDiagram')?.route).toBe('/notebook');
    });

    it.each(['editStudyCycle', 'deleteStudyCycle', 'deleteStudySession'])('sends the cycle write %s to the notebook', (tool) => {
        expect(isReadTool(tool)).toBe(false);
        expect(toolDestination(tool)?.route).toBe('/notebook');
    });

    /** What the assistant saves about the person or their things is read and fixed on that page. */
    it('sends what the assistant remembers to the Second Brain page', () => {
        for (const tool of SECOND_BRAIN_TOOLS) {
            expect(isReadTool(tool)).toBe(false);
            expect(toolDestination(tool)).toEqual({ key: 'secondBrain', route: '/second-brain', labelKey: 'SecondBrain' });
        }
        expect([...SECOND_BRAIN_TOOLS].sort()).toEqual(['rememberAboutItem', 'rememberAboutUser']);
    });

    it('shows reading the notes about a thing as a chip', () => {
        expect(isReadTool('readItemNotes')).toBe(true);
        expect(toolDestination('readItemNotes')).toBeNull();
    });

    /**
     * The old hidden note and the note each conversation keeps about itself have no screen.
     * Old transcripts still carry the first, and they keep rendering as the chip they always were.
     */
    it('has nowhere to send the conversation notes', () => {
        expect(toolDestination('updateGlobalContext')).toBeNull();
        expect(toolDestination('updateChatContext')).toBeNull();
        expect(isReadTool('updateGlobalContext')).toBe(false);
        expect(toolDestination(undefined)).toBeNull();
    });
});
