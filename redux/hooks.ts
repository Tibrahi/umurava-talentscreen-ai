"use client";

import { useDispatch, useSelector, useStore } from "react-redux";
import type { AppDispatch, RootState, store } from "./store";

// Typed hooks reduce mistakes and improve DX when wiring large dashboards.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof store>();
