import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useAuth } from '@clerk/clerk-react'
import api from '../services/api'
import type { User } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirectForUser(user: User): string {
  if (!user.is_password_reset) return '/settings/reset-password'
  return '/dashboard'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const { isSignedIn }                  = useAuth()
  const navigate                        = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Already signed in → bounce to dashboard immediately
  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true })
  }, [isSignedIn, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return

    setError('')
    setLoading(true)

    try {
      // 1. Authenticate with Clerk
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      })

      if (result.status !== 'complete') {
        setError('Sign-in could not be completed. Please try again.')
        setLoading(false)
        return
      }

      // 2. Activate the session so the JWT is available for API calls
      await setActive({ session: result.createdSessionId })

      // 3. Fetch the user's profile from our backend to read is_password_reset
      //    Small delay to ensure Clerk has propagated the session cookie
      await new Promise((r) => setTimeout(r, 200))
      const { data: user } = await api.get<User>('/api/v1/auth/me')

      navigate(redirectForUser(user), { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid email or password. Please try again.'
      // Clerk wraps errors as objects with a `.errors` array
      const clerkErr = err as { errors?: { message: string }[] }
      setError(clerkErr?.errors?.[0]?.message ?? msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      {/* Subtle background accent */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-100">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              {/* Icon mark */}
              <svg
                width="36" height="36" viewBox="0 0 36 36" fill="none"
                xmlns="http://www.w3.org/2000/svg" aria-hidden
              >
                <rect width="36" height="36" rx="10" fill="#57BEEB" />
                <path
                  d="M10 18 C10 12 14 9 18 9 C22 9 26 12 26 18 C26 24 22 27 18 27"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
                />
                <circle cx="18" cy="18" r="3.5" fill="white" />
                <path
                  d="M18 27 C15 27 12 25 10 22"
                  stroke="#58C697" strokeWidth="2.5" strokeLinecap="round" fill="none"
                />
              </svg>
              <span className="text-2xl font-bold text-gray-900">
                Proxa<span className="text-primary">Screen</span>
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Prostate Cancer Risk Assessment Platform
            </p>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                disabled={loading}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer accent */}
          <div className="mt-8 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">ProxaScreen · Secure access</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline spinner ─────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
