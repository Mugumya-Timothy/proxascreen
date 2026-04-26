import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useCreateClinician } from '../hooks/useClinicians'

interface FormState {
  first_name:    string
  last_name:     string
  email:         string
  phone:         string
  temp_password: string
}

const DEFAULT_TEMP_PASSWORD = 'ProxaScreen2026!@nyson'

const INITIAL: FormState = {
  first_name:    '',
  last_name:     '',
  email:         '',
  phone:         '',
  temp_password: DEFAULT_TEMP_PASSWORD,
}

export default function AddClinicianModal({ onClose }: { onClose: () => void }) {
  const [form, setForm]             = useState<FormState>(INITIAL)
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')

  const mutation = useCreateClinician()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(
      {
        first_name:    form.first_name.trim(),
        last_name:     form.last_name.trim(),
        email:         form.email.trim().toLowerCase(),
        phone:         form.phone.trim() || undefined,
        temp_password: form.temp_password,
      },
      {
        onSuccess: () => {
          setCreatedEmail(form.email.trim().toLowerCase())
          setShowSuccess(true)
          toast.success('Clinician created', {
            description: `Welcome email sent to ${form.email.trim().toLowerCase()}`,
          })
        },
      },
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">

        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-center justify-between rounded-t-2xl px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <UserGroupIcon className="h-5 w-5 text-white/80" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {showSuccess ? 'Clinician Created' : 'Add Clinician'}
              </h2>
              <p className="mt-0.5 text-xs text-white/55">
                {showSuccess ? 'Staff member registered successfully' : 'Register a new medical staff member'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {showSuccess ? (
            <div className="flex flex-col items-center py-6 text-center">
              {/* Gradient success ring */}
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
                style={{ background: 'linear-gradient(135deg, #58C697 0%, #25a872 100%)' }}
              >
                <CheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">All done!</h3>
              <p className="mt-1.5 max-w-sm text-sm text-gray-500">
                A welcome email with login credentials has been sent to{' '}
                <span className="font-semibold text-gray-700">{createdEmail}</span>.
              </p>

              <div className="mt-6 w-full rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-left">
                <p className="text-xs font-semibold text-secondary">What happens next?</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  The clinician will receive an email with their temporary password and instructions to set up their account on first login.
                </p>
              </div>

              <button
                className="btn-primary mt-6 w-full"
                onClick={() => { setForm(INITIAL); setShowSuccess(false); mutation.reset() }}
              >
                Add Another Clinician
              </button>
            </div>
          ) : (
            <form id="add-clinician-form" onSubmit={handleSubmit} className="space-y-4">

              <Section title="Clinician Details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <input
                      required
                      type="text"
                      className="input mt-1"
                      placeholder="e.g. John"
                      value={form.first_name}
                      onChange={(e) => set('first_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <input
                      required
                      type="text"
                      className="input mt-1"
                      placeholder="e.g. Doe"
                      value={form.last_name}
                      onChange={(e) => set('last_name', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Email Address</Label>
                    <input
                      required
                      type="email"
                      className="input mt-1"
                      placeholder="e.g. john.doe@hospital.com"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>
                      Phone{' '}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </Label>
                    <input
                      type="tel"
                      className="input mt-1"
                      placeholder="e.g. +1 555 000 1234"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Account Setup">
                <div>
                  <Label>Temporary Password</Label>
                  <input
                    readOnly
                    type="text"
                    className="input mt-1 cursor-default select-all bg-gray-50 font-mono text-sm text-gray-500"
                    value={form.temp_password}
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    The clinician will be prompted to change this on first login.
                  </p>
                </div>
              </Section>

              {mutation.isError && (
                <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : 'Something went wrong. Please try again.'}
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        {!showSuccess ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="add-clinician-form"
              disabled={mutation.isPending}
              className="btn-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating…' : 'Create Clinician'}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 justify-end border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      </div>
      <div className="space-y-4 p-4">
        {children}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600">{children}</label>
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
