import { configureStore } from "@reduxjs/toolkit";
import {
    persistStore,
    persistReducer,
    createMigrate,
    createTransform,
    PERSIST,
    REGISTER,
    REHYDRATE,
} from "redux-persist";
import storage from 'redux-persist/lib/storage'
import { restoreFocusState, rootReducer } from "@beyou/state";
import type { RootState } from "@beyou/state";
// Version and migrations live apart so they can be tested without booting this module, which
// calls persistStore() on import. See that file for why any of it is needed.
import { PERSIST_VERSION, migrations } from "./persistMigrations";

/**
 * The focus slice comes back with its timer and its settings, and nothing else.
 *
 * A blacklist entry would be too blunt (the pomodoro has to survive a reload) and no entry at
 * all is what caused the bug: the reconciler hard-sets the stored slice, so a tab closed inside
 * the focus screen booted the app with `mode: "ultrafoco"` and the dashboard hid the button that
 * leads there. The rule about WHICH fields survive lives with the slice that defines them; this
 * only says when it runs. Outbound only: storage may already hold a stale mode written by an
 * earlier build, so the repair has to happen on the way in.
 */
const focusVisitTransform = createTransform(
    (state) => state,
    (state) => restoreFocusState(state),
    { whitelist: ['focus'] },
);

const persistConfig = {
    key: 'root',
    version: PERSIST_VERSION,
    storage: storage,
    blacklist: ['snapshot', 'perfil', 'celebration'],
    transforms: [focusVisitTransform],
    // `debug: false` keeps a failed migration quiet in production; it still falls back to the
    // reducer's initial state rather than rehydrating something broken.
    migrate: createMigrate(migrations as never, { debug: false }),
}

const persistedReducer = persistReducer<RootState>(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: [REGISTER, REHYDRATE, PERSIST]
        }
    })
})

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export const persistor = persistStore(store);
export default store;
