import { useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import AssessmentResultModal from '../components/AssessmentResultModal'
import { usePatient } from '../hooks/usePatients'
import { useCreateAssessment } from '../hooks/useAssessments'
import type { Assessment, DietType, PhysicalActivityLevel, CreateAssessmentRequest } from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DIET_OPTIONS:     readonly DietType[]              = ['fatty', 'mixed', 'healthy']
const ACTIVITY_OPTIONS: readonly PhysicalActivityLevel[] = ['low', 'moderate', 'high']

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  bmi:                     string
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  family_history:          boolean
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
}

const INITIAL: FormState = {
  bmi:                     '',
  smoker:                  false,
  diet_type:               'mixed',
  physical_activity_level: 'moderate',
  family_history:          false,
  regular_health_checkup:  false,
  prostate_exam_done:      false,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateAssessmentPage() {
  const { id: patientId } = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { pathname }      = useLocation()
  const base              = pathname.startsWith('/admin') ? '/admin' : ''

  const [form, setForm] = useState<FormState>(INITIAL)
  const [result, setResult] = useState<Assessment | null>(null)

  const { data: patient, isLoading: patientLoading, isError: patientError } = usePatient(patientId)

  const { mutate, isPending, isError, error } = useCreateAssessment()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId || !patient) return

    const payload: CreateAssessmentRequest = {
      age:                     patient.age,
      bmi:                     Number(form.bmi),
      smoker:                  form.smoker,
      diet_type:               form.diet_type,
      physical_activity_level: form.physical_activity_level,
      family_history:          form.family_history,
      regular_health_checkup:  form.regular_health_checkup,
      prostate_exam_done:      form.prostate_exam_done,
    }

    mutate(
      { patientId, data: payload },
      { onSuccess: (assessment) => setResult(assessment) },
    )
  }

  function handleModalClose() {
    navigate(`${base}/patients/${patientId}`)
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (patientLoading) return <PageSkeleton />

  if (patientError || !patient) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-outline text-sm">← Back</button>
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Could not load patient details. Please go back and try again.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`${base}/patients`} className="hover:text-primary transition-colors">Patients</Link>
          <span>/</span>
          <Link to={`${base}/patients/${patientId}`} className="hover:text-primary transition-colors">
            {patient.full_name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">New Assessment</span>
        </nav>

        {/* Patient context card */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white shadow-sm">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{patient.full_name}</p>
            <p className="text-sm text-gray-500">
              {patient.patient_number} · Age {patient.age} · Submitted {formatDate(patient.date_of_submission)}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="Assessment Inputs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* BMI */}
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

              {/* Diet type */}
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

              {/* Physical activity */}
              <div>
                <Label>Physical Activity Level</Label>
                <select
                  className="input mt-1"
                  value={form.physical_activity_level}
                  onChange={(e) => set('physical_activity_level', e.target.value as PhysicalActivityLevel)}
                >
                  {ACTIVITY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{capitalize(o)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Boolean toggles */}
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

          {/* Submission error */}
          {isError && (
            <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
              {error instanceof Error
                ? error.message
                : 'Failed to run the assessment. Please check your inputs and try again.'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary min-w-[180px]"
            >
              {isPending ? 'Running Assessment…' : 'Run Assessment'}
            </button>
            <Link to={`/patients/${patientId}`} className="btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Result modal shown on success */}
      {result && (
        <AssessmentResultModal assessment={result} onClose={handleModalClose} />
      )}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500">{children}</label>
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

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-pulse">
      <div className="h-5 w-64 rounded bg-gray-100" />
      <div className="h-20 rounded-2xl bg-gray-100" />
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
        <div className="h-4 w-32 rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

