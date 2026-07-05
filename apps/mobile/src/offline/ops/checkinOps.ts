import { refreshItemGroup } from '@beyou/state/routine/todayRoutineSlice';
import { localDateKey, writeKV } from '@beyou/offline';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, queueMutation } from '../mutations';

function nowHHmm(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Both ops below are only ever called by useRoutineCheckin AFTER it has already
 * confirmed isOffline() — there is no online branch here (unlike the other ops
 * files). XP/level/constance are NEVER computed locally: the locally-built
 * check always carries xpGenerated: 0, and the real RefreshUI only arrives once
 * routine.check / routine.skip replays (Task 13) and flows through applyRefreshUi
 * — celebrations fire then, not here.
 */
export async function checkItemOffline(
  dto: itemGroupToCheck,
  groupItemId: string,
  checked: boolean
): Promise<{ queued: true }> {
  const store = getOfflineStore();
  const check = {
    id: uuidv4(),
    checkDate: localDateKey(),
    checkTime: nowHHmm(),
    checked,
    xpGenerated: 0,
  };
  store.dispatch(refreshItemGroup({ groupItemId, check }));
  // ponytail: replay is a server-side toggle; a response lost after commit + retry
  // can double-toggle — accepted v1 ceiling, Phase 3 adds op idempotency keys.
  await queueMutation({
    opType: 'routine.check',
    payload: { dto, date: localDateKey() },
    entityId: groupItemId,
    mirror: (db) =>
      writeKV(db, 'todayRoutine', { date: localDateKey(), routine: store.getState().todayRoutine.routine }),
  });
  return { queued: true };
}

export async function skipItemOffline(
  dto: itemGroupToSkip,
  groupItemId: string,
  skipped: boolean
): Promise<{ queued: true }> {
  const store = getOfflineStore();
  const check = {
    id: uuidv4(),
    checkDate: localDateKey(),
    checkTime: nowHHmm(),
    checked: false,
    skipped,
    xpGenerated: 0,
  };
  store.dispatch(refreshItemGroup({ groupItemId, check }));
  // ponytail: replay is a server-side toggle; a response lost after commit + retry
  // can double-toggle — accepted v1 ceiling, Phase 3 adds op idempotency keys.
  await queueMutation({
    opType: 'routine.skip',
    payload: { dto, date: localDateKey() },
    entityId: groupItemId,
    mirror: (db) =>
      writeKV(db, 'todayRoutine', { date: localDateKey(), routine: store.getState().todayRoutine.routine }),
  });
  return { queued: true };
}
