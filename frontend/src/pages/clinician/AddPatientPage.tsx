import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AssessmentResultModal from '../../components/AssessmentResultModal'
import { useCreatePatient } from '../../hooks/usePatients'
import type { Assessment } from '../../types'

const DIET_OPTIONS    = ['fatty', 'mixed', 'healthy'] as const
const ACTIVITY_OPTIONS = ['low', 'moderate', 'high'] as const

type DietType     = typeof DIET_OPTIONS[number]
type ActivityType = typeof ACTIVITY_OPTIONS[number]

interface FormState {
  full_name:                string
  age:                      string
  date_of_submission:       string
  bmi:                      string
  smoker:                   boolean
  diet_type:                DietType
  physical_activity_level:  ActivityType
  family_history:           boolean
  regular_health_checkup:   boolean
  prostate_exam_done:       boolean
}

const INITIAL: FormState = {
  full_name:               '',
  age:                     '',
  date_of_submission:      new Date().toISOString().slice(0, 10),
  bmi:                     '',
  smoker:                  false,
  diet_type:               'mixed',
  physical_activity_level: 'moderate',
  family_history:          false,
  regular_health_checkup:  false,
  prostate_exam_done:      false,
}

export default function AddPatientPage() {
  const navigate = useNavigate()
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [result, setResult]   = useState<Assessment | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)

  const mutation = useCreatePatient()

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
        family_history:          form.family_history,
        regular_health_checkup:  form.regular_health_checkup,
        prostate_exam_done:      form.prostate_exam_done,
      },
      {
        onSuccess: ({ patient, assessment }) => {
          setPatientId(patient.id)
          setResult(assessment)
        },
      },
    )
  }

  function handleModalClose() {
    navigate(`/patients/${patientId}`)
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/patients" className="hover:text-primary transition-colors">Patients</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Add Patient</span>
        </nav>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Patient info */}
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

          {/* Assessment inputs */}
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
            </div>

            {/* Boolean fields */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Toggle
                label="Smoker"
                checked={form.smoker}
                onChange={(v) => set('smoker', v)}
              />
              <Toggle
                label="Family History of Prostate Cancer"
                checked={form.family_history}
                onChange={(v) => set('family_history', v)}
              />
              <Toggle
                label="Regular Health Checkup"
                checked={form.regular_health_checkup}
                onChange={(v) => set('regular_health_checkup', v)}
              />
              <Toggle
                label="Prostate Exam Done"
                checked={form.prostate_exam_done}
                onChange={(v) => set('prostate_exam_done', v)}
              />
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
              {mutation.isPending ? 'Running Assessment…' : 'Add Patient & Run Assessment'}
            </button>
            <Link to="/patients" className="btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Result modal */}
      {result && (
        <AssessmentResultModal assessment={result} onClose={handleModalClose} />
      )}
    </>
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
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
        checked
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        checked ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {checked ? '✓' : ''}
      </span>
    </button>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
