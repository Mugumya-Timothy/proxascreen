import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useResetPassword } from '../hooks/useAuth'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const { user }   = useUser()
  const navigate   = useNavigate()

  const isAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin'

  const [newPassword,       setNewPassword]       = useState('')
  const [confirmPassword,   setConfirmPassword]   = useState('')
  const [showNew,           setShowNew]           = useState(false)
  const [showConfirm,       setShowConfirm]       = useState(false)
  const [error,             setError]             = useState('')
  const [success,           setSuccess]           = useState(false)

  const { mutate: resetPassword, isPending } = useResetPassword()

  const firstName = user?.firstName ?? 'there'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    resetPassword(
      { new_password: newPassword },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(() => navigate(isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true }), 2000)
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to update password. Please try again.',
          )
        },
      },
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #f0f9fe 0%, #f8fffe 50%, #f0fdf8 100%)' }}>

      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[440px]">
        <div
          className="rounded-3xl bg-white px-10 py-10"
          style={{
            boxShadow: '0 8px 40px 0 rgba(87,190,235,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.06)',
            border: '1px solid rgba(87,190,235,0.13)',
          }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'rgba(87,190,235,0.12)' }}>
              <LockIcon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">Set your password</h1>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              Hi <strong className="text-gray-600">{firstName}</strong>! Your account was set up by an administrator.
              Please create a new password before continuing.
            </p>
          </div>

          {/* ── Success state ────────────────────────────────────────── */}
          {success ? (
            <div className="rounded-2xl px-5 py-6 text-center ring-1"
              style={{ background: 'rgba(88,198,151,0.08)', borderColor: 'rgba(88,198,151,0.25)' }}>
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: 'rgba(88,198,151,0.15)' }}>
                <CheckIcon className="h-5 w-5 text-secondary" />
              </div>
              <p className="font-semibold text-gray-900">Password updated!</p>
              <p className="mt-1 text-sm text-gray-400">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* New password */}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    disabled={isPending}
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
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
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
                    disabled={isPending}
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
                  disabled={isPending}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #5FB0E3 0%, #2aa8dd 100%)',
                    boxShadow: '0 4px 14px 0 rgba(87,190,235,0.35)',
                  }}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Updating…
                    </span>
                  ) : (
                    'Set new password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Password strength meter ───────────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)              score++
  if (pw.length >= 12)             score++
  if (/[A-Z]/.test(pw))           score++
  if (/[0-9]/.test(pw))           score++
  if (/[^A-Za-z0-9]/.test(pw))    score++

  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Good',  color: 'bg-primary' }
  return             { score, label: 'Strong', color: 'bg-secondary' }
}

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = getStrength(password)
  const pct = Math.min((score / 5) * 100, 100)
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  )
}

// ── Inline icons ──────────────────────────────────────────────────────────────

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

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'h-4 w-4'} fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
