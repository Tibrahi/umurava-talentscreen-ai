"use client";

import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "./services/api";
import { uiSlice } from "./slices/ui-slice";

// The store composes UI state + API cache so pages have one reliable state source.
export const store = configureStore({
  reducer: {
    [appApi.reducerPath]: appApi.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(appApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
