import { describe, expect, it } from 'vitest';
import { FOCUS_TOOLS, KNOWN_TOOLS, READ_TOOLS, ROUTINE_ITEM_TOOLS, isReadTool, toolDestination } from '../toolRegistry';

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
    ])('sends %s to %s', (tool, route) => {
        expect(toolDestination(tool)?.route).toBe(route);
    });

    it('has nowhere to send the memory tools', () => {
        expect(toolDestination('updateGlobalContext')).toBeNull();
        expect(toolDestination(undefined)).toBeNull();
    });
});
