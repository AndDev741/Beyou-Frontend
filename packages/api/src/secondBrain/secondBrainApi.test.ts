import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setHttpClient, setLogger } from '../index';
import { ApiError, type HttpClient } from '../httpClient';
import {
    deleteSecondBrainNote,
    deleteSecondBrainOldNote,
    discardSecondBrainOldNoteLine,
    editSecondBrainNote,
    keepSecondBrainOldNoteLine,
} from './secondBrainApi';

const t = ((key: string) => key) as never;

const client = (patch: Partial<HttpClient>): HttpClient => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...patch,
});

beforeEach(() => setLogger({ error: () => {} }));

/**
 * The routes and bodies of the memory and old-note calls, as the wire contract pins them. The
 * backend is built against the same contract in parallel, so a path typed differently on
 * either side shows up here before it shows up as a 404 on the page.
 */
describe('Second Brain memory calls', () => {
    it('edits a note with its text and answers the note the server kept', async () => {
        const note = { id: 'n1', text: 'Rain stops me', origin: 'ANSWER' };
        const put = vi.fn(async () => ({ data: note, headers: {} }) as never);
        setHttpClient(client({ put }));

        const result = await editSecondBrainNote('n1', 'Rain stops me', t);

        expect(put).toHaveBeenCalledWith('/second-brain/notes/n1', { text: 'Rain stops me' });
        expect(result).toEqual({ success: note });
    });

    it('deletes a note, which answers no body', async () => {
        const del = vi.fn(async () => ({ data: undefined, headers: {} }) as never);
        setHttpClient(client({ delete: del }));

        expect(await deleteSecondBrainNote('n1', t)).toEqual({ success: true });
        expect(del).toHaveBeenCalledWith('/second-brain/notes/n1');
    });

    it('sends an old-note line back exactly as it came, to keep or to drop', async () => {
        const post = vi.fn(async () => ({ data: { lines: ['Other line.'], fact: null }, headers: {} }) as never);
        setHttpClient(client({ post }));

        await keepSecondBrainOldNoteLine('  Likes tea.', t);
        await discardSecondBrainOldNoteLine('Has a dog.', t);

        expect(post).toHaveBeenNthCalledWith(1, '/second-brain/old-note/keep', { text: '  Likes tea.' });
        expect(post).toHaveBeenNthCalledWith(2, '/second-brain/old-note/discard', { text: 'Has a dog.' });
    });

    it('deletes the whole old note', async () => {
        const del = vi.fn(async () => ({ data: undefined, headers: {} }) as never);
        setHttpClient(client({ delete: del }));

        expect(await deleteSecondBrainOldNote(t)).toEqual({ success: true });
        expect(del).toHaveBeenCalledWith('/second-brain/old-note');
    });

    /** The page tells a full profile apart from any other failure, so the key has to survive. */
    it('passes a full profile back as its error key', async () => {
        const post = vi.fn(async () => {
            throw new ApiError(409, { errorKey: 'SECOND_BRAIN_FACT_LIMIT_REACHED' });
        });
        setHttpClient(client({ post }));

        const result = await keepSecondBrainOldNoteLine('Likes tea.', t);

        expect(result.error?.errorKey).toBe('SECOND_BRAIN_FACT_LIMIT_REACHED');
    });
});
