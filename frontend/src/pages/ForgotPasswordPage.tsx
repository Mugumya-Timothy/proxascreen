import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSignIn } from '@clerk/clerk-react'
import { friendlyClerkError } from '../utils/errors'
import api from '../services/api'
import type { User } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'email' | 'code' | 'success'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const navigate = useNavigate()

  const [stage,           setStage]           = useState<Stage>('email')
  const [email,           setEmail]           = useState('')
  const [code,            setCode]            = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)

  // ── Step 1: request OTP ────────────────────────────────────────────────────

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      })
      setStage('code')
    } catch (err: unknown) {
      setError(friendlyClerkError(err, 'Could not send reset code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify code + set new password ─────────────────────────────────

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      // Verify the code — status transitions to 'needs_new_password'
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
      })

      if (attempt.status === 'needs_new_password') {
        // Set the new password and activate session
        const reset = await signIn.resetPassword({
          password: newPassword,
          signOutOfOtherSessions: true,
        })
        if (reset.status === 'complete') {
          await setActive({ session: reset.createdSessionId })
          setStage('success')
          const dest = await api.get<User>('/api/v1/auth/me')
            .then(({ data: u }) => u.role === 'admin' ? '/admin/dashboard' : '/dashboard')
            .catch(() => '/dashboard')
          setTimeout(() => navigate(dest, { replace: true }), 2500)
        }
      } else if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId })
        setStage('success')
        const dest = await api.get<User>('/api/v1/auth/me')
          .then(({ data: u }) => u.role === 'admin' ? '/admin/dashboard' : '/dashboard')
          .catch(() => '/dashboard')
        setTimeout(() => navigate(dest, { replace: true }), 2500)
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (err: unknown) {
      setError(friendlyClerkError(err, 'Invalid or expired code. Please try again.'))
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
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lgrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lgrid)" />
        </svg>
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
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[70px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[70px]" />
        </div>

        <div className="relative w-full max-w-[400px] py-8">

          {/* Mobile brand mark */}
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

          {/* ── Success state ───────────────────────────────────────────── */}
          {stage === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15">
                <CheckIcon className="h-8 w-8 text-secondary" />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">Password updated!</h1>
              <p className="mt-2 text-sm text-gray-400">Your password has been reset successfully. Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              {/* ── Heading ─────────────────────────────────────────── */}
              <div className="mb-6 lg:mb-7">
                <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 text-center lg:text-left">
                  {stage === 'email' ? 'Forgot your password?' : 'Check your email'}
                </h1>
                <p className="mt-1.5 text-sm text-gray-400 text-center lg:text-left">
                  {stage === 'email'
                    ? "Enter your email and we'll send you a reset code."
                    : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
                </p>
              </div>

              {/* ── Stage 1: Email form ──────────────────────────────── */}
              {stage === 'email' && (
                <form onSubmit={handleSendCode} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="fp-email"
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

                  {error && <ErrorBanner message={error} />}

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
                      {loading ? <InlineSpinner label="Sending…" /> : 'Send reset code'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Stage 2: Code + new password form ───────────────── */}
              {stage === 'code' && (
                <form onSubmit={handleReset} noValidate className="space-y-4">

                  {/* Verification code */}
                  <div className="space-y-1.5">
                    <label htmlFor="fp-code" className="block text-sm font-medium text-gray-700">
                      Verification code
                    </label>
                    <input
                      id="fp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      disabled={loading}
                    />
                  </div>

                  {/* New password */}
                  <div className="space-y-1.5">
                    <label htmlFor="fp-new-password" className="block text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="fp-new-password"
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setShowNew((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-300 hover:text-gray-500 transition-colors"
                        aria-label={showNew ? 'Hide password' : 'Show password'}>
                        <EyeIcon open={showNew} />
                      </button>
                    </div>
                    {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label htmlFor="fp-confirm-password" className="block text-sm font-medium text-gray-700">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="fp-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={[
                          'w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 outline-none transition disabled:opacity-50',
                          confirmPassword.length > 0 && confirmPassword !== newPassword
                            ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20',
                        ].join(' ')}
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-300 hover:text-gray-500 transition-colors"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword === newPassword && (
                      <p className="flex items-center gap-1 text-xs text-secondary">
                        <CheckIcon className="h-3.5 w-3.5" /> Passwords match
                      </p>
                    )}
                  </div>

                  {error && <ErrorBanner message={error} />}

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
                      {loading ? <InlineSpinner label="Resetting…" /> : 'Reset password'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStage('email'); setError(''); setCode('') }}
                    className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    ← Back to email
                  </button>
                </form>
              )}

              {/* Back to login */}
              <p className="mt-6 text-center text-sm text-gray-400">
                Remembered it?{' '}
                <Link to="/sign-in" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}

          {/* Mobile SSL badge */}
          <div className="lg:hidden mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-300">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span>256-bit SSL encrypted · Secure access</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function InlineSpinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </span>
  )
}

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)           score++
  if (pw.length >= 12)          score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Good',  color: 'bg-primary' }
  return                { score, label: 'Strong', color: 'bg-secondary' }
}

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = getStrength(password)
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min((score / 5) * 100, 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

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
