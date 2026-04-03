import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import AssessmentResultModal from './AssessmentResultModal'
import { usePatient } from '../hooks/usePatients'
import { useCreateAssessment } from '../hooks/useAssessments'
import type { Assessment, DietType, PhysicalActivityLevel, CreateAssessmentRequest } from '../types'

const DIET_OPTIONS:     readonly DietType[]              = ['fatty', 'mixed', 'healthy']
const ACTIVITY_OPTIONS: readonly PhysicalActivityLevel[] = ['low', 'moderate', 'high']

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

export default function NewAssessmentModal({
  patientId,
  onClose,
}: {
  patientId: string
  onClose: () => void
}) {
  const [form, setForm]     = useState<FormState>(INITIAL)
  const [result, setResult] = useState<Assessment | null>(null)

  const { data: patient, isLoading: patientLoading } = usePatient(patientId)
  const { mutate, isPending, isError, error }        = useCreateAssessment()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) return

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
      {
        onSuccess: (assessment) => {
          setResult(assessment)
          toast.success('Assessment submitted', {
            description: `Risk level: ${assessment.risk_level}`,
          })
        },
        onError: (err) => {
          toast.error('Assessment failed', {
            description: err instanceof Error ? err.message : 'Please try again',
          })
        },
      },
    )
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">New Assessment</h2>
              {patient && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {patient.full_name} · {patient.patient_number} · Age {patient.age}
                </p>
              )}
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
            {patientLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100" />)}
              </div>
            ) : (
              <form id="new-assessment-form" onSubmit={handleSubmit} className="space-y-6">
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
                        onChange={(e) => set('physical_activity_level', e.target.value as PhysicalActivityLevel)}
                      >
                        {ACTIVITY_OPTIONS.map((o) => (
                          <option key={o} value={o}>{capitalize(o)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Toggle label="Smoker" checked={form.smoker} onChange={(v) => set('smoker', v)} />
                    <Toggle label="Family History of Prostate Cancer" checked={form.family_history} onChange={(v) => set('family_history', v)} />
                    <Toggle label="Regular Health Checkup" checked={form.regular_health_checkup} onChange={(v) => set('regular_health_checkup', v)} />
                    <Toggle label="Prostate Exam Done" checked={form.prostate_exam_done} onChange={(v) => set('prostate_exam_done', v)} />
                  </div>
                </Section>

                {isError && (
                  <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
                    {error instanceof Error ? error.message : 'Failed to run assessment. Please try again.'}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="new-assessment-form"
              disabled={isPending || patientLoading}
              className="btn-primary min-w-[180px]"
            >
              {isPending ? 'Running Assessment…' : 'Run Assessment'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <AssessmentResultModal assessment={result} onClose={onClose} />
      )}
    </>,
    document.body,
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
