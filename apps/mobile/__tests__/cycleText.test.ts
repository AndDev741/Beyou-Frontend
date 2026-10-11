/**
 * The phone's own study cycle helpers (candidates for @beyou/state): the line under a block, the
 * page a block studies on, a move in the list, a topic's page picker and the calendar arithmetic
 * the history and the week lean on.
 */
import {
  blockSubline, isoDayOf, mondayOf, moveBlock, studyPageOf, topicPages, weekdayLabel, weekdayOfIso,
} from '../src/notebook/cycles/cycleText';
import { topicTree, trtBlocks, TOPICS } from './fixtures/studyCycle';

const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}(${JSON.stringify(values)})` : key);

describe('study cycle helpers', () => {
  it('reads a concept by its subject and where it came from, a time block by its page or note', () => {
    const [, , concept, chosen, time] = trtBlocks();
    expect(blockSubline({ ...concept, target: concept.progress.target, cardsDue: 2 }, t)).toBe(
      'Dir. Constitucional · StudyCycleMobileSourceNext · StudyCycleMobileCardsDue({"count":2})',
    );
    expect(blockSubline({ ...chosen, target: chosen.progress.target }, t)).toBe(
      'Português · StudyCycleMobileSourcePage · StudyCycleMobileQuizRequired',
    );
    expect(blockSubline({ ...time, target: null }, t)).toBe('Lista de questões FCC');
    // A roadmap concept not picked yet says it will be.
    expect(blockSubline({ ...concept, target: null }, t)).toBe('StudyCycleMobileNextUndecided');
  });

  it('studies on the concept, else the page the block carries, else the topic', () => {
    const [, , concept, , time] = trtBlocks();
    expect(studyPageOf({ ...concept, target: concept.progress.target })).toEqual({ id: 'p-cc', title: 'Controle de constitucionalidade' });
    expect(studyPageOf({ topic: TOPICS.adm, page: { id: 'x', title: 'X', icon: null }, target: null })).toEqual({ id: 'x', title: 'X' });
    expect(studyPageOf({ ...time, target: null })).toEqual({ id: 'adm', title: 'Dir. Administrativo' });
  });

  it('moves a block one step and refuses to move past either end', () => {
    const blocks = trtBlocks();
    expect(moveBlock(blocks, 1, -1)!.map((b) => b.id)).toEqual(['b2', 'b1', 'b3', 'b4', 'b5']);
    expect(moveBlock(blocks, 0, -1)).toBeNull();
    expect(moveBlock(blocks, 4, 1)).toBeNull();
  });

  it("offers the topic and its own pages, depth first, never a page linked in from elsewhere", () => {
    const tree = topicTree('adm');
    expect(topicPages(TOPICS.adm, tree as never).map((page) => [page.id, page.depth])).toEqual([
      ['adm', 0],
      ['adm-a', 1],
      ['adm-a1', 2],
    ]);
    expect(topicPages(TOPICS.adm, undefined)).toEqual([{ id: 'adm', title: 'Dir. Administrativo', depth: 0 }]);
  });

  it('knows the weekday and the Monday of a day, and the day of an instant in a zone', () => {
    expect(weekdayOfIso('2026-10-14')).toBe('WEDNESDAY');
    expect(weekdayOfIso('2026-10-11')).toBe('SUNDAY');
    expect(mondayOf('2026-10-14')).toBe('2026-10-12');
    expect(mondayOf('2026-10-11')).toBe('2026-10-05');
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    // 01:30 UTC is still the day before in São Paulo.
    expect(isoDayOf('2026-10-14T01:30:00Z', 'America/Sao_Paulo')).toBe('2026-10-13');
    expect(isoDayOf('2026-10-14T01:30:00Z', 'UTC')).toBe('2026-10-14');
    expect(weekdayLabel('MONDAY', 'en')).toBe('Mon');
  });
});
