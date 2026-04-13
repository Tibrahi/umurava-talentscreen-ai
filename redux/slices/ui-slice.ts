"use client";

import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  sidebarExpanded: boolean;
}

const initialState: UiState = {
  sidebarExpanded: true,
};

// Sidebar state is global because multiple pages share the same shell and controls.
export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarExpanded = !state.sidebarExpanded;
    },
    setSidebarExpanded(state, action: { payload: boolean }) {
      state.sidebarExpanded = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarExpanded } = uiSlice.actions;
