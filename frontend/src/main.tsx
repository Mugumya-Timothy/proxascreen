import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { Provider as ReduxProvider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import ApiAuthSync from './components/ApiAuthSync'
import { store } from './store'
import './index.css'

// ── Unregister any stale service workers ──────────────────────────────────────
// This project does not use a service worker. Any registered SW (e.g. from a
// previous build or browser cache) can serve outdated assets and produce the
// Workbox "navigation route not matched" warning. Clear them on every boot.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister()
    }
  })
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        afterSignOutUrl="/sign-in"
      >
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiAuthSync>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
            </BrowserRouter>
          </ApiAuthSync>
        </QueryClientProvider>
      </ReduxProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
