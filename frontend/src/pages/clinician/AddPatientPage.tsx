import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import AssessmentResultModal from '../../components/AssessmentResultModal'
import { useCreatePatient } from '../../hooks/usePatients'
import type { Assessment, SymptomStatus } from '../../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DIET_OPTIONS     = ['fatty', 'mixed', 'healthy'] as const
const ACTIVITY_OPTIONS = ['low', 'moderate', 'high'] as const
const ALCOHOL_OPTIONS  = ['no', 'moderate', 'high'] as const
type DietType     = typeof DIET_OPTIONS[number]
type ActivityType = typeof ACTIVITY_OPTIONS[number]
type AlcoholType  = typeof ALCOHOL_OPTIONS[number]

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

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  full_name:                string
  age:                      string
  date_of_submission:       string
  bmi:                      string
  smoker:                   boolean
  diet_type:                DietType
  physical_activity_level:  ActivityType
  alcohol_consumption:      AlcoholType
  family_history_relatives: string[]
  regular_health_checkup:   boolean
  prostate_exam_done:       boolean
  symptom_dict:             Record<string, SymptomStatus>
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
  family_history_relatives: [],
  regular_health_checkup:  false,
  prostate_exam_done:      false,
  symptom_dict:            buildDefaultSymptomDict(),
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddPatientPage() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const base         = pathname.startsWith('/admin') ? '/admin' : ''

  const [form, setForm]           = useState<FormState>(INITIAL)
  const [result, setResult]       = useState<Assessment | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [ageWarn, setAgeWarn]     = useState(false)

  const mutation = useCreatePatient()

  const age       = Number(form.age)
  const isBlocked = form.age !== '' && age < 40

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'age') setAgeWarn(false)
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
    if (isBlocked) return

    if (age >= 40 && age < 45 && !ageWarn) {
      setAgeWarn(true)
      return
    }

    const hasSymptoms = Object.values(form.symptom_dict).some((s) => s !== 'Not Documented')
    mutation.mutate(
      {
        full_name:                form.full_name.trim(),
        age:                      age,
        date_of_submission:       form.date_of_submission,
        bmi:                      Number(form.bmi),
        smoker:                   form.smoker,
        diet_type:                form.diet_type,
        physical_activity_level:  form.physical_activity_level,
        alcohol_consumption:      form.alcohol_consumption,
        family_history_relatives: form.family_history_relatives,
        regular_health_checkup:   form.regular_health_checkup,
        prostate_exam_done:       form.prostate_exam_done,
        symptom_dict:             hasSymptoms ? form.symptom_dict : undefined,
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
    navigate(`${base}/patients/${patientId}`)
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`${base}/patients`} className="hover:text-primary transition-colors">Patients</Link>
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
                  min={1}
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

            {/* Age gate */}
            {isBlocked && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm ring-1 ring-red-200">
                <p className="font-semibold text-red-700">Patient Not Eligible</p>
                <p className="mt-0.5 text-red-600">
                  Prostate cancer risk screening is not applicable for patients under 40 years of age.
                </p>
              </div>
            )}

            {/* Age advisory */}
            {ageWarn && !isBlocked && age >= 40 && age < 45 && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
                <p className="font-semibold text-amber-700">Age Advisory (40–44 years)</p>
                <p className="mt-0.5 text-amber-600">
                  Risk is generally very low for patients aged 40–44. A clinician should review
                  this result before any referral. Click <strong>Add Patient</strong> again to proceed.
                </p>
              </div>
            )}
          </Section>

          {!isBlocked && (
            <>
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
                      {DIET_OPTIONS.map((o) => <option key={o} value={o}>{capitalize(o)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Physical Activity Level</Label>
                    <select
                      className="input mt-1"
                      value={form.physical_activity_level}
                      onChange={(e) => set('physical_activity_level', e.target.value as ActivityType)}
                    >
                      {ACTIVITY_OPTIONS.map((o) => <option key={o} value={o}>{capitalize(o)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Alcohol Consumption</Label>
                    <select
                      className="input mt-1"
                      value={form.alcohol_consumption}
                      onChange={(e) => set('alcohol_consumption', e.target.value as AlcoholType)}
                    >
                      {ALCOHOL_OPTIONS.map((o) => <option key={o} value={o}>{capitalize(o)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Toggle label="Smoker"                checked={form.smoker}                 onChange={(v) => set('smoker', v)} />
                  <Toggle label="Regular Health Checkup" checked={form.regular_health_checkup} onChange={(v) => set('regular_health_checkup', v)} />
                  <Toggle label="Prostate Exam Done"    checked={form.prostate_exam_done}     onChange={(v) => set('prostate_exam_done', v)} />
                </div>
              </Section>

              {/* Family history */}
              <Section title="Family History of Prostate Cancer">
                <p className="text-xs text-gray-500">Select all blood relatives diagnosed with prostate cancer.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FAMILY_HISTORY_RELATIVES.map((r) => {
                    const checked = form.family_history_relatives.includes(r.key)
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => toggleRelative(r.key)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                          checked
                            ? 'border-primary/30 bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                        }`}>
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

              {/* Symptoms */}
              <Section title="Presenting Symptoms">
                <p className="text-xs text-gray-500">Record the status of each symptom. ⚠ denotes high-priority symptoms.</p>
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
                            {sym.urgent && <span className="mr-1 text-amber-500">⚠</span>}
                            {sym.display}
                          </td>
                          {SYMPTOM_STATUSES.map((status) => (
                            <td key={status} className="px-3 py-2.5 text-center">
                              <input
                                type="radio"
                                name={`page_symptom_${sym.key}`}
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
            </>
          )}

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
              disabled={mutation.isPending || isBlocked}
              className="btn-primary min-w-[220px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Running Assessment…' : 'Add Patient & Run Assessment'}
            </button>
            <Link to={`${base}/patients`} className="btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>

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
