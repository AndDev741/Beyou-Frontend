import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, PERSIST, REGISTER, REHYDRATE } from "redux-persist";
import storage from 'redux-persist/lib/storage'
import rootReducer, { RootState } from "./rootReducer";

const persistConfig = {
    key: 'root',
    storage: storage,
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