import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Pre-typed hooks — use these throughout the app instead of plain
// useDispatch / useSelector so TypeScript inference works automatically.
export const useAppDispatch: () => AppDispatch              = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
