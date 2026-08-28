import { configureStore } from "@reduxjs/toolkit";
import {
    persistStore,
    persistReducer,
    createMigrate,
    PERSIST,
    REGISTER,
    REHYDRATE,
} from "redux-persist";
import storage from 'redux-persist/lib/storage'
import { rootReducer } from "@beyou/state";
import type { RootState } from "@beyou/state";
// Version and migrations live apart so they can be tested without booting this module, which
// calls persistStore() on import. See that file for why any of it is needed.
import { PERSIST_VERSION, migrations } from "./persistMigrations";

const persistConfig = {
    key: 'root',
    version: PERSIST_VERSION,
    storage: storage,
    blacklist: ['snapshot', 'perfil', 'celebration'],
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
