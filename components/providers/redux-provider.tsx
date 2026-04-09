"use client";

import { Provider } from "react-redux";
import { store } from "@/redux/store";

// Provider wraps the full app so every page and component can use RTK Query + global UI state.
export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
