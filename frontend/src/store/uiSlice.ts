import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id:      string
  message: string
  type:    ToastType
}

interface UIState {
  toasts: Toast[]
}

const initialState: UIState = {
  toasts: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
      state.toasts.push({
        id:      Date.now().toString(),
        ...action.payload,
      })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    clearToasts(state) {
      state.toasts = []
    },
  },
})

export const { addToast, removeToast, clearToasts } = uiSlice.actions
export default uiSlice.reducer
