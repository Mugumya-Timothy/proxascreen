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
  const [form, setForm]         = useState<FormState>(INITIAL)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add Clinician</h2>
            <p className="mt-0.5 text-xs text-gray-500">Register a new medical staff member</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {showSuccess ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckIcon className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Clinician created successfully</h3>
                <p className="mt-1 text-sm text-gray-500">
                  A welcome email with login credentials has been sent to{' '}
                  <span className="font-medium text-gray-700">{createdEmail}</span>.
                </p>
              </div>
              <button
                onClick={() => { setForm(INITIAL); setShowSuccess(false); mutation.reset() }}
                className="btn-primary"
              >
                Add Another Clinician
              </button>
            </div>
          ) : (
            <form id="add-clinician-form" onSubmit={handleSubmit} className="space-y-6">
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
                <div>
                  <Label>Temporary Password</Label>
                  <input
                    readOnly
                    type="text"
                    className="input mt-1 font-mono text-sm cursor-default select-all bg-gray-50 text-gray-500"
                    value={form.temp_password}
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    The clinician will be prompted to change this on first login.
                  </p>
                </div>
              </Section>

              {mutation.isError && (
                <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : 'Something went wrong. Please try again.'}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!showSuccess && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="add-clinician-form"
              disabled={mutation.isPending}
              className="btn-primary min-w-[160px]"
            >
              {mutation.isPending ? 'Creating…' : 'Create Clinician'}
            </button>
          </div>
        )}
        {showSuccess && (
          <div className="flex justify-end border-t border-gray-100 px-6 py-4 shrink-0">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-100 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500">{children}</label>
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
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
