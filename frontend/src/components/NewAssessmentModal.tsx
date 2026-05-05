import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import AssessmentResultModal from './AssessmentResultModal'
import { usePatient } from '../hooks/usePatients'
import { useCreateAssessment } from '../hooks/useAssessments'
import type {
  Assessment, DietType, PhysicalActivityLevel, AlcoholConsumption,
  SymptomStatus, CreateAssessmentRequest,
} from '../types'

const DIET_OPTIONS:     readonly DietType[]              = ['fatty', 'mixed', 'healthy']
const ACTIVITY_OPTIONS: readonly PhysicalActivityLevel[] = ['low', 'moderate', 'high']
const ALCOHOL_OPTIONS:  readonly AlcoholConsumption[]    = ['no', 'moderate', 'high']

const FAMILY_HISTORY_RELATIVES: { key: string; label: string }[] = [
  { key: 'father',               label: 'Father' },
  { key: 'brother',              label: 'Brother' },
  { key: 'paternal_grandfather', label: 'Paternal Grandfather' },
  { key: 'maternal_grandfather', label: 'Maternal Grandfather' },
]

const SYMPTOM_DEFINITIONS: { key: string; display: string; urgent?: boolean }[] = [
  { key: 'difficulty_urination', display: 'Difficulty in urination (hesitancy, weak stream)' },
  { key: 'increased_frequency',  display: 'Increased urinary frequency (day/night)' },
  { key: 'urinary_retention',    display: 'Urinary retention', urgent: true },
  { key: 'haematuria',           display: 'Haematuria (blood in urine)', urgent: true },
  { key: 'dysuria',              display: 'Dysuria (painful urination)' },
  { key: 'pelvic_discomfort',    display: 'Lower abdominal/pelvic discomfort' },
  { key: 'perineal_pain',        display: 'Perineal or rectal pain' },
  { key: 'back_pain',            display: 'Back pain (lumbar/sacral)' },
  { key: 'bone_pain',            display: 'Bone pain (generalised or localised)', urgent: true },
  { key: 'leg_weakness',         display: 'Leg weakness or paralysis', urgent: true },
  { key: 'urinary_incontinence', display: 'Urinary incontinence' },
  { key: 'weight_loss',          display: 'Weight loss' },
  { key: 'fatigue',              display: 'Fatigue or generalised body weakness' },
  { key: 'erectile_dysfunction', display: 'Erectile dysfunction' },
  { key: 'others',               display: 'Others (specify)' },
]

const SYMPTOM_STATUSES: SymptomStatus[] = ['Present', 'Absent', 'Not Documented']

function buildDefaultSymptomDict(): Record<string, SymptomStatus> {
  return Object.fromEntries(
    SYMPTOM_DEFINITIONS.map((s) => [s.key, 'Not Documented' as SymptomStatus]),
  )
}

interface FormState {
  bmi:                     string
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  alcohol_consumption:     AlcoholConsumption
  family_history_relatives: string[]
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
  symptom_dict:            Record<string, SymptomStatus>
}

const INITIAL: FormState = {
  bmi:                     '',
  smoker:                  false,
  diet_type:               'mixed',
  physical_activity_level: 'moderate',
  alcohol_consumption:     'no',
  family_history_relatives: [],
  regular_health_checkup:  false,
  prostate_exam_done:      false,
  symptom_dict:            buildDefaultSymptomDict(),
}

export default function NewAssessmentModal({
  patientId,
  onClose,
}: {
  patientId: string
  onClose: () => void
}) {
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [result, setResult]   = useState<Assessment | null>(null)
  const [ageWarn, setAgeWarn] = useState(false)

  const { data: patient, isLoading: patientLoading } = usePatient(patientId)
  const { mutate, isPending, isError, error }        = useCreateAssessment()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleRelative(key: string) {
    setForm((prev) => {
      const relatives = prev.family_history_relatives.includes(key)
        ? prev.family_history_relatives.filter((r) => r !== key)
        : [...prev.family_history_relatives, key]
      return { ...prev, family_history_relatives: relatives }
    })
  }

  function setSymptom(key: string, status: SymptomStatus) {
    setForm((prev) => ({
      ...prev,
      symptom_dict: { ...prev.symptom_dict, [key]: status },
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) return

    const age = patient.age
    if (age < 40) return // blocked — button is disabled; guard only

    if (age >= 40 && age < 45 && !ageWarn) {
      setAgeWarn(true)
      return
    }

    const symptomDict = form.symptom_dict
    const hasSymptoms = Object.values(symptomDict).some((s) => s !== 'Not Documented')

    const payload: CreateAssessmentRequest = {
      age,
      bmi:                     Number(form.bmi),
      smoker:                  form.smoker,
      diet_type:               form.diet_type,
      physical_activity_level: form.physical_activity_level,
      alcohol_consumption:     form.alcohol_consumption,
      family_history_relatives: form.family_history_relatives,
      regular_health_checkup:  form.regular_health_checkup,
      prostate_exam_done:      form.prostate_exam_done,
      symptom_dict:            hasSymptoms ? symptomDict : undefined,
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

  const age = patient?.age ?? null
  const isBlocked = age !== null && age < 40

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">

          {/* ── Header ── */}
          <div
            className="flex shrink-0 items-center justify-between rounded-t-2xl px-6 py-5 sm:rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 100%)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <ClipboardIcon className="h-5 w-5 text-white/80" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">New Assessment</h2>
                {patient ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-white/55">{patient.full_name}</span>
                    <span className="inline-flex items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/60">
                      {patient.patient_number}
                    </span>
                    <span className="text-xs text-white/40">Age {patient.age}</span>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-white/55">Loading patient details…</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {patientLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : isBlocked ? (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-4 ring-1 ring-red-200">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Patient Not Eligible</p>
                  <p className="mt-1 text-sm text-red-600">
                    This patient is {age} years old. Prostate cancer risk screening is not
                    applicable for patients under 40 years of age.
                  </p>
                </div>
              </div>
            ) : (
              <form id="new-assessment-form" onSubmit={handleSubmit} className="space-y-4">

                {/* Age advisory banner */}
                {ageWarn && age !== null && age >= 40 && age < 45 && (
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-700">Age Advisory (40–44 years)</p>
                      <p className="mt-0.5 text-xs text-amber-600">
                        Prostate cancer risk is generally very low for patients aged 40–44.
                        This result should be reviewed by a clinician before any referral decision.
                        Click <strong>Run Assessment</strong> again to proceed.
                      </p>
                    </div>
                  </div>
                )}

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
                    <div>
                      <Label>Alcohol Consumption</Label>
                      <select
                        className="input mt-1"
                        value={form.alcohol_consumption}
                        onChange={(e) => set('alcohol_consumption', e.target.value as AlcoholConsumption)}
                      >
                        {ALCOHOL_OPTIONS.map((o) => (
                          <option key={o} value={o}>{capitalize(o)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Toggle label="Smoker"                 checked={form.smoker}                 onChange={(v) => set('smoker', v)} />
                    <Toggle label="Regular Health Checkup" checked={form.regular_health_checkup} onChange={(v) => set('regular_health_checkup', v)} />
                    <Toggle label="Prostate Exam Done"     checked={form.prostate_exam_done}     onChange={(v) => set('prostate_exam_done', v)} />
                  </div>
                </Section>

                <Section title="Family History of Prostate Cancer">
                  <p className="text-xs text-gray-500 -mt-1">
                    Select all blood relatives diagnosed with prostate cancer.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {FAMILY_HISTORY_RELATIVES.map((r) => {
                      const checked = form.family_history_relatives.includes(r.key)
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => toggleRelative(r.key)}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-150 ${
                            checked
                              ? 'border-primary/30 bg-primary/[0.05] text-primary'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {checked && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </span>
                          <span className="font-medium">{r.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </Section>

                <Section title="Presenting Symptoms">
                  <p className="text-xs text-gray-500 -mt-1">
                    Record the status of each symptom. ⚠ denotes high-priority symptoms.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          <th className="px-3 py-2 w-full">Symptom</th>
                          {SYMPTOM_STATUSES.map((s) => (
                            <th key={s} className="px-3 py-2 text-center whitespace-nowrap">{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {SYMPTOM_DEFINITIONS.map((sym) => (
                          <tr key={sym.key} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5 text-gray-700 leading-snug">
                              {sym.urgent && (
                                <span className="mr-1 text-amber-500" title="High-priority symptom">⚠</span>
                              )}
                              {sym.display}
                            </td>
                            {SYMPTOM_STATUSES.map((status) => (
                              <td key={status} className="px-3 py-2.5 text-center">
                                <input
                                  type="radio"
                                  name={`symptom_${sym.key}`}
                                  value={status}
                                  checked={form.symptom_dict[sym.key] === status}
                                  onChange={() => setSymptom(sym.key, status)}
                                  className="h-4 w-4 cursor-pointer accent-primary"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>

                {isError && (
                  <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">
                      {error instanceof Error ? error.message : 'Failed to run assessment. Please try again.'}
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="new-assessment-form"
              disabled={isPending || patientLoading || isBlocked}
              className="btn-primary min-w-[180px] disabled:cursor-not-allowed disabled:opacity-50"
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
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void
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

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
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
