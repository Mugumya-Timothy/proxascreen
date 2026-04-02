import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach Clerk JWT to every request ───────────────────
//
// Clerk sets window.Clerk once the <ClerkProvider> initialises.
// session.getToken() returns a fresh JWT (cached by Clerk until near expiry).
api.interceptors.request.use(async (config) => {
  try {
    // window.Clerk is typed as `any` by the browser SDK; cast through unknown.
    const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk
    const token = await clerk?.session?.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // If Clerk hasn't initialised yet (e.g. public routes), skip silently.
  }
  return config
})

// ── Response interceptor: normalise errors ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string })?.error ??
        error.message ??
        'An unexpected error occurred'
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  },
)

export default api
