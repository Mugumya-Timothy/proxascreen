import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useResetPassword } from '../hooks/useAuth'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const { user }   = useUser()
  const navigate   = useNavigate()

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)

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
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {/* Subtle background accents */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-100">

          {/* Icon + heading */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <LockIcon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Set your password</h1>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Hi <strong>{firstName}</strong>! Your account was set up by an administrator.
              Please create a new password before continuing.
            </p>
          </div>

          {/* Success state */}
          {success ? (
            <div className="rounded-xl bg-secondary/10 px-5 py-6 text-center ring-1 ring-secondary/30">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                <CheckIcon className="h-5 w-5 text-secondary" />
              </div>
              <p className="font-semibold text-gray-900">Password updated!</p>
              <p className="mt-1 text-sm text-gray-500">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* New password */}
              <div>
                <label htmlFor="new-password" className="label">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="input"
                  disabled={isPending}
                />
                {newPassword.length > 0 && (
                  <PasswordStrength password={newPassword} />
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirm-password" className="label">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={[
                    'input',
                    confirmPassword.length > 0 && confirmPassword !== newPassword
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : '',
                  ].join(' ')}
                  disabled={isPending}
                />
                {confirmPassword.length > 0 && confirmPassword === newPassword && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-secondary">
                    <CheckIcon className="h-3.5 w-3.5" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full py-2.5 text-base"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Updating…
                  </span>
                ) : (
                  'Set new password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Hint */}
        {!success && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Use at least 8 characters with a mix of letters and numbers for a stronger password.
          </p>
        )}
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
