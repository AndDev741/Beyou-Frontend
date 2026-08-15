import { persistor } from "../../redux/store";
import { logger } from "../../utils/logger";

/**
 * The browser-side half of deleting an account.
 *
 * `persistor.purge()` empties the redux-persist blob, which is where the habits,
 * goals, categories and tasks live. It is not everything: the tutorial phase, the AI
 * onboarding wizard's progress, collapsed routine sections and the goal horizons are
 * all plain localStorage, written outside redux entirely. Purging alone leaves those
 * behind, so the next person to open this browser inherits the deleted account's
 * onboarding state and finds a half-walked tutorial waiting for them.
 *
 * Swept by prefix rather than by a list of key names. A list is correct on the day it
 * is written and quietly wrong the first time someone adds a key — and the failure is
 * invisible, since nothing breaks, data just lingers. Every key this app writes is
 * already prefixed `beyou`, in both the dotted and dashed spellings.
 *
 * The theme survives on purpose: it is how this machine is set up, not something the
 * deleted account owned, and resetting a person's dark mode as they leave is a
 * strange parting gesture.
 */
const THEME_KEY = "beyou-theme";

export function clearLocalAccountState(): void {
    try {
        const doomed: string[] = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);
            if (key && key.startsWith("beyou") && key !== THEME_KEY) {
                doomed.push(key);
            }
        }
        // Collected first, removed after: removing during the walk reindexes the store
        // underneath it and every second key is skipped.
        doomed.forEach((key) => window.localStorage.removeItem(key));
        window.sessionStorage.clear();
    } catch {
        // A browser with storage disabled or a full quota must not be the reason the
        // user is left sitting inside a deleted account.
    }
}

/**
 * Purge, clear, leave — in that order, and leave no matter what.
 *
 * The redirect is unconditional because the account is already gone by the time this
 * runs. If the teardown throws, staying on a configuration page belonging to a deleted
 * account is the worse of the two outcomes.
 *
 * Each step gets its own try, so one failing cannot cancel the next. Failures are
 * swallowed rather than rethrown: every caller is on its way out of the app, so there
 * is nobody left to handle it, and letting it escape only produces an unhandled
 * rejection that the error reporter files as a bug in a session that is about to end.
 * They are logged, which is all anyone can act on.
 */
export async function tearDownAndLeave(): Promise<void> {
    try {
        await persistor.purge();
    } catch (failure) {
        logger.error("Purging the persisted store failed", failure);
    }
    try {
        // Its own try, and not chained behind the purge. Sharing one meant a rejected
        // purge jumped straight to the catch and skipped this line entirely — which is
        // the worst possible pairing, since the redux blob is keyed `persist:root` and
        // so is the one thing the prefix sweep cannot pick up as a fallback.
        clearLocalAccountState();
    } catch (failure) {
        logger.error("Clearing local account state failed", failure);
    }
    window.location.href = "/";
}
