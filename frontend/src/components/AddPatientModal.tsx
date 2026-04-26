import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AssessmentResultModal from './AssessmentResultModal'
import { useCreatePatient } from '../hooks/usePatients'
import { useServicesHealth } from '../hooks/useDashboard'
import type { Assessment } from '../types'

const DIET_OPTIONS     = ['fatty', 'mixed', 'healthy'] as const
const ACTIVITY_OPTIONS = ['low', 'moderate', 'high'] as const
const ALCOHOL_OPTIONS  = ['no', 'moderate', 'high'] as const

type DietType     = typeof DIET_OPTIONS[number]
type ActivityType = typeof ACTIVITY_OPTIONS[number]
type AlcoholType  = typeof ALCOHOL_OPTIONS[number]

interface FormState {
  full_name:               string
  age:                     string
  date_of_submission:      string
  bmi:                     string
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: ActivityType
  alcohol_consumption:     AlcoholType
  family_history:          boolean
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
}

const INITIAL: FormState = {
  full_name:               '',
  age:                     '',
  date_of_submission:      new Date().toISOString().slice(0, 10),
  bmi:                     '',
  smoker:                  false,
  diet_type:               'mixed',
  physical_activity_level: 'moderate',
  alcohol_consumption:     'no',
  family_history:          false,
  regular_health_checkup:  false,
  prostate_exam_done:      false,
}

export default function AddPatientModal({
  onClose,
  base = '',
}: {
  onClose: () => void
  base?: string
}) {
  const navigate                  = useNavigate()
  const [form, setForm]           = useState<FormState>(INITIAL)
  const [result, setResult]       = useState<Assessment | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)
  const mutation                  = useCreatePatient()

  const { data: health, isLoading: healthLoading } = useServicesHealth()
  const modelOnline = !healthLoading && health?.model_service.status === 'online'

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(
      {
        full_name:               form.full_name.trim(),
        age:                     Number(form.age),
        date_of_submission:      form.date_of_submission,
        bmi:                     Number(form.bmi),
        smoker:                  form.smoker,
        diet_type:               form.diet_type,
        physical_activity_level: form.physical_activity_level,
        alcohol_consumption:     form.alcohol_consumption,
        family_history:          form.family_history,
        regular_health_checkup:  form.regular_health_checkup,
        prostate_exam_done:      form.prostate_exam_done,
      },
      {
        onSuccess: ({ patient, assessment }) => {
          setPatientId(patient.id)
          setResult(assessment)
          toast.success('Patient registered', {
            description: `${patient.full_name} · Assessment complete`,
          })
        },
      },
    )
  }

  function handleResultClose() {
    onClose()
    navigate(`${base}/patients/${patientId}`)
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">

          {/* ── Header ── */}
          <div
            className="flex shrink-0 items-center justify-between rounded-t-2xl px-6 py-5"
            style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <UserPlusIcon className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Add New Patient</h2>
                <p className="mt-0.5 text-xs text-white/55">Register a patient and run their first risk assessment</p>
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

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="add-patient-modal-form" onSubmit={handleSubmit} className="space-y-4">

              <Section title="Patient Information">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Full Name</Label>
                    <input
                      required
                      type="text"
                      className="input mt-1"
                      placeholder="e.g. John Doe"
                      value={form.full_name}
                      onChange={(e) => set('full_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <input
                      required
                      type="number"
                      min={18}
                      max={120}
                      className="input mt-1"
                      placeholder="e.g. 55"
                      value={form.age}
                      onChange={(e) => set('age', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date of Submission</Label>
                    <input
                      required
                      type="date"
                      className="input mt-1"
                      value={form.date_of_submission}
                      onChange={(e) => set('date_of_submission', e.target.value)}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Assessment Inputs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>BMI</Label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      min={10}
                      max={80}
                      className="input mt-1"
                      placeholder="e.g. 24.5"
                      value={form.bmi}
                      onChange={(e) => set('bmi', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Diet Type</Label>
                    <select
                      className="input mt-1"
                      value={form.diet_type}
                      onChange={(e) => set('diet_type', e.target.value as DietType)}
                    >
                      {DIET_OPTIONS.map((o) => (
                        <option key={o} value={o}>{capitalize(o)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Physical Activity Level</Label>
                    <select
                      className="input mt-1"
                      value={form.physical_activity_level}
                      onChange={(e) => set('physical_activity_level', e.target.value as ActivityType)}
                    >
                      {ACTIVITY_OPTIONS.map((o) => (
                        <option key={o} value={o}>{capitalize(o)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Alcohol Consumption</Label>
                    <select
                      className="input mt-1"
                      value={form.alcohol_consumption}
                      onChange={(e) => set('alcohol_consumption', e.target.value as AlcoholType)}
                    >
                      {ALCOHOL_OPTIONS.map((o) => (
                        <option key={o} value={o}>{capitalize(o)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Toggle label="Smoker"                          checked={form.smoker}                  onChange={(v) => set('smoker', v)} />
                  <Toggle label="Family History of Prostate Cancer" checked={form.family_history}         onChange={(v) => set('family_history', v)} />
                  <Toggle label="Regular Health Checkup"          checked={form.regular_health_checkup} onChange={(v) => set('regular_health_checkup', v)} />
                  <Toggle label="Prostate Exam Done"              checked={form.prostate_exam_done}      onChange={(v) => set('prostate_exam_done', v)} />
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
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 space-y-3 border-t border-gray-100 px-6 py-4">

            {/* Model offline banner */}
            {!healthLoading && !modelOnline && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs leading-relaxed text-amber-700">
                  <span className="font-semibold">Model service is offline.</span>{' '}
                  Assessments are unavailable right now. Please try again once the model service is back online.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                form="add-patient-modal-form"
                disabled={mutation.isPending || !modelOnline}
                title={!modelOnline ? 'Model service is offline' : undefined}
                className="btn-primary min-w-[200px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? 'Running Assessment…' : 'Add Patient & Run Assessment'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {result && (
        <AssessmentResultModal assessment={result} onClose={handleResultClose} />
      )}
    </>,
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150 ${
        checked
          ? 'border-primary/30 bg-primary/[0.05] text-primary'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="text-left font-medium leading-snug">{label}</span>
      {/* Pill switch */}
      <span
        className={`relative ml-3 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
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
