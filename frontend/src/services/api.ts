import axios from 'axios'
import { friendlyApiError } from '../utils/errors'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type AuthTokenGetter = () => Promise<string | null>

let authTokenGetter: AuthTokenGetter | null = null

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAuthTokenGetter(getter: AuthTokenGetter | null) {
  authTokenGetter = getter
}

// ── Request interceptor: attach Clerk JWT to every request ───────────────────
api.interceptors.request.use(async (config) => {
  if (!authTokenGetter) {
    return config
  }

  try {
    const token = await authTokenGetter()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // If token resolution fails, let the request continue and surface the API error.
  }
  return config
})

// ── Response interceptor: normalise errors ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = friendlyApiError(error.response?.status)
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  },
)

export default api
