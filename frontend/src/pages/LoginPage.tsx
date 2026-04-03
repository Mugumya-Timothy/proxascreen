import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSignIn, useAuth } from '@clerk/clerk-react'
import api from '../services/api'
import type { User } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirectForUser(user: User): string {
  if (!user.is_password_reset) {
    return user.role === 'admin' ? '/admin/settings/reset-password' : '/settings/reset-password'
  }
  return user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const { isSignedIn }                  = useAuth()
  const navigate                        = useNavigate()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe,   setRememberMe]   = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)

  // Already signed in → bounce to correct dashboard based on role
  useEffect(() => {
    if (!isSignedIn) return
    api.get<User>('/api/v1/auth/me').then(({ data: user }) => {
      navigate(redirectForUser(user), { replace: true })
    }).catch(() => {
      navigate('/dashboard', { replace: true })
    })
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
    <div className="flex h-screen overflow-hidden">

      {/* ── Left branding panel (desktop only) ───────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #5FB0E3 0%, #2aa8dd 55%, #3dbf8a 100%)' }}
      >
        {/* Subtle dot grid */}
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lgrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lgrid)" />
        </svg>
        {/* Decorative orbs */}
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-[60px]" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-[60px]" />

        <div className="relative z-10 flex flex-col items-center text-center px-14">
          <img src="/logo.png" alt="ProxaScreen logo" width={76} height={76} className="mb-5 drop-shadow-lg" />
          <div className="text-white mb-2" style={{ fontSize: '36px', lineHeight: 1 }}>
            <span style={{ fontWeight: 400 }}>Proxa</span><span style={{ fontWeight: 700 }}>Screen</span>
          </div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', marginBottom: '32px' }}>
            Prostate Cancer Risk Screening
          </div>
          <p className="text-white/75 text-sm leading-relaxed max-w-[260px]">
            AI-assisted risk stratification designed to help clinicians act faster with greater confidence.
          </p>
        </div>

        {/* Bottom SSL badge */}
        <div className="absolute bottom-6 flex items-center gap-1.5 text-white/50 text-xs">
          <ShieldIcon className="h-3.5 w-3.5" />
          <span>256-bit SSL encrypted · Secure access</span>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div
        className="flex flex-1 items-center justify-center px-6 overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #f0f9fe 0%, #f8fffe 60%, #f0fdf8 100%)' }}
      >
        {/* Mobile-only background decoration */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[70px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[70px]" />
        </div>

        <div className="relative w-full max-w-[400px] py-8">

          {/* ── Mobile brand mark (hidden on desktop) ──────────────────── */}
          <div className="lg:hidden mb-5 flex flex-col items-center gap-2.5">
            <img src="/logo.png" alt="ProxaScreen logo" width={52} height={52} />
            <div className="text-center">
              <div style={{ fontSize: '24px', lineHeight: 1, color: '#5FB0E3' }}>
                <span style={{ fontWeight: 400 }}>Proxa</span><span style={{ fontWeight: 600 }}>Screen</span>
              </div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#b0b0b0', marginTop: '4px' }}>
                Prostate Cancer Risk Screening
              </div>
            </div>
          </div>

          {/* ── Heading ────────────────────────────────────────────────── */}
          <div className="mb-6 lg:mb-7">
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 text-center lg:text-left">
              Log in to your account
            </h1>
            <p className="mt-1.5 text-sm text-gray-400 text-center lg:text-left">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* ── Form ───────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-primary"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #5FB0E3 0%, #2aa8dd 100%)',
                  boxShadow: '0 4px 14px 0 rgba(87,190,235,0.35)',
                }}
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
            </div>
          </form>

          {/* Mobile SSL badge */}
          <div className="lg:hidden mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-300">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span>256-bit SSL encrypted · Secure access</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Supporting icons ──────────────────────────────────────────────────────────

// ── AlertIcon / ShieldIcon / EyeIcon / Spinner ───────────────────────────────

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'h-4 w-4'} fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'h-4 w-4'} fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

// ── Eye icon ─────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
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
