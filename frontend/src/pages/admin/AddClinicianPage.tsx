import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateClinician } from '../../hooks/useClinicians'

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

export default function AddClinicianPage() {
  const navigate      = useNavigate()
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [showSuccess, setShowSuccess] = useState(false)

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
      { onSuccess: () => setShowSuccess(true) },
    )
  }

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Clinician created successfully</h2>
            <p className="mt-1 text-sm text-gray-500">
              A welcome email with login credentials has been sent to{' '}
              <span className="font-medium text-gray-700">{form.email}</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setForm(INITIAL); setShowSuccess(false); mutation.reset() }}
              className="btn-primary"
            >
              Add Another Clinician
            </button>
            <button
              onClick={() => navigate('/clinicians')}
              className="btn-outline"
            >
              Back to Clinicians
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/clinicians" className="hover:text-primary transition-colors">Clinicians</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Add Clinician</span>
      </nav>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <div>
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
            <div>
              <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
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
          <div className="max-w-sm">
            <Label>Temporary Password</Label>
            <input
              required
              type="text"
              minLength={8}
              className="input mt-1 font-mono text-sm"
              placeholder="Min. 8 characters"
              value={form.temp_password}
              onChange={(e) => set('temp_password', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-400">
              The clinician will be prompted to change this on first login.
            </p>
          </div>
        </Section>

        {/* Error */}
        {mutation.isError && (
          <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary min-w-[180px]"
          >
            {mutation.isPending ? 'Creating…' : 'Create Clinician'}
          </button>
          <Link to="/clinicians" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500">{children}</label>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
