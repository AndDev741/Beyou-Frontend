import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, PERSIST, REGISTER, REHYDRATE } from "redux-persist";
import storage from 'redux-persist/lib/storage'
import rootReducer from "./rootReducer";

const persistConfig = {
    key: 'root',
    storage: storage,
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoreActions: [REGISTER, REHYDRATE, PERSIST]
        }
    })
})

export const persistor = persistStore(store);
export default store;