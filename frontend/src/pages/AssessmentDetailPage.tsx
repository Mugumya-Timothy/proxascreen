import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import RiskBadge from '../components/RiskBadge'
import { useAssessment } from '../hooks/useAssessments'
import { usePatient } from '../hooks/usePatients'
import { generateAssessmentPDF } from '../utils/generatePDF'
import type { Assessment, ContributingFactor, LifestyleFactorNote, FamilyHistoryDetail, SymptomAdjustment, RiskLevel } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// Weighted position 0–100: where on the Low→High spectrum this patient sits
function riskPosition(low: number, medium: number, high: number): number {
  return low * 0 + medium * 0.5 + high * 1
}

const FEATURE_LABELS: Record<string, string> = {
  age:                     'Age',
  bmi:                     'BMI',
  bmi_category:            'BMI Category',
  age_group:               'Age Group',
  smoker:                  'Smoker',
  alcohol_consumption:     'Alcohol Use',
  diet_type:               'Diet Type',
  physical_activity_level: 'Physical Activity',
  family_history:          'Family History',
  regular_health_checkup:  'Health Checkup',
  prostate_exam_done:      'Prostate Exam',
  risk_factor_count:       'Risk Factors',
}

function featureLabel(key: string): string {
  return (
    FEATURE_LABELS[key] ??
    key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  )
}

function fiBandColor(_val: number, rank: number): string {
  if (rank === 0)  return '#b91c1c'
  if (rank <= 2)   return '#ea580c'
  if (rank <= 5)   return '#2563eb'
  return '#93c5fd'
}

function fiBandLabel(rank: number): string {
  if (rank === 0)  return 'Highest'
  if (rank <= 2)   return 'High'
  if (rank <= 5)   return 'Moderate'
  return 'Low'
}

const SYMPTOM_ORDER: { key: string; display: string; urgent?: boolean }[] = [
  { key: 'difficulty_urination', display: 'Difficulty with urination' },
  { key: 'increased_frequency',  display: 'Increased urinary frequency' },
  { key: 'urinary_retention',    display: 'Urinary retention',   urgent: true },
  { key: 'haematuria',           display: 'Haematuria (blood in urine)', urgent: true },
  { key: 'dysuria',              display: 'Dysuria (painful urination)' },
  { key: 'pelvic_discomfort',    display: 'Pelvic discomfort' },
  { key: 'perineal_pain',        display: 'Perineal or rectal pain' },
  { key: 'back_pain',            display: 'Back pain' },
  { key: 'bone_pain',            display: 'Bone pain (generalised or localised)', urgent: true },
  { key: 'leg_weakness',         display: 'Leg weakness or paralysis', urgent: true },
  { key: 'urinary_incontinence', display: 'Urinary incontinence' },
  { key: 'weight_loss',          display: 'Weight loss' },
  { key: 'fatigue',              display: 'Fatigue' },
  { key: 'erectile_dysfunction', display: 'Erectile dysfunction' },
  { key: 'others',               display: 'Other symptoms' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  'Present':        { bg: 'bg-red-100',   text: 'text-red-700',    label: 'Present'         },
  'Absent':         { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Absent'          },
  'Not Documented': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Not Documented'  },
}



function normalizeSymptomLabel(key: string): string {
  const known = SYMPTOM_ORDER.find((sym) => sym.key === key)
  if (known) return known.display
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseStoredSymptoms(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function getPresentingSymptoms(
  rawSymptoms: Record<string, string> | null,
  symptomsPresent: string | null | undefined,
): { key: string; display: string; urgent: boolean }[] {
  const presentKeys = new Set<string>()

  if (rawSymptoms) {
    for (const [key, status] of Object.entries(rawSymptoms)) {
      if (status === 'Present') presentKeys.add(key)
    }
  }

  for (const key of parseStoredSymptoms(symptomsPresent)) {
    presentKeys.add(key)
  }

  const ordered = SYMPTOM_ORDER
    .filter((sym) => presentKeys.has(sym.key))
    .map((sym) => ({ key: sym.key, display: sym.display, urgent: Boolean(sym.urgent) }))

  const extras = [...presentKeys]
    .filter((key) => !SYMPTOM_ORDER.some((sym) => sym.key === key))
    .map((key) => ({ key, display: normalizeSymptomLabel(key), urgent: false }))

  return [...ordered, ...extras]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const { id }        = useParams<{ id: string }>()
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const base          = pathname.startsWith('/admin') ? '/admin' : ''
  const { user }      = useUser()
  const clinicianName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Unknown Clinician'

  const { data: assessment, isLoading: aLoading, isError: aError } = useAssessment(id)
  const { data: patient,    isLoading: pLoading }                  = usePatient(assessment?.patient_id)

  if (aLoading || (!!assessment && pLoading)) return <PageSkeleton />

  if (aError || !assessment) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-outline text-sm">← Back</button>
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Assessment not found or failed to load. It may have been removed.
        </div>
      </div>
    )
  }

  const symAdj      = assessment.symptom_adjustment as SymptomAdjustment | null
  const fhDetail    = assessment.family_history_detail as FamilyHistoryDetail | null
  const rawSymptoms = assessment.raw_symptom_dict as Record<string, string> | null
  const presentingSymptoms = getPresentingSymptoms(rawSymptoms, assessment.symptoms_present)
  const urgentPresentingSymptoms = presentingSymptoms.filter((symptom) => symptom.urgent)

  const finalRisk  = (assessment.final_risk_level ?? assessment.risk_level) as RiskLevel
  const baseRisk   = (assessment.base_risk_level  ?? assessment.risk_level) as RiskLevel
  const adjApplied = symAdj?.adjustment_applied ?? false

  const pos = riskPosition(
    assessment.low_percentage,
    assessment.medium_percentage,
    assessment.high_percentage,
  )

  const probData = [
    { name: 'High Risk',   value: assessment.high_percentage,   fill: '#ef4444' },
    { name: 'Medium Risk', value: assessment.medium_percentage, fill: '#facc15' },
    { name: 'Low Risk',    value: assessment.low_percentage,    fill: '#22c55e' },
  ]

  const fiEntries = Object.entries(assessment.feature_importances ?? {}).sort(
    (a, b) => b[1] - a[1],
  )
  const fiData = fiEntries.map(([key, val], rank) => ({
    name:  featureLabel(key),
    value: val,
    fill:  fiBandColor(val, rank),
    tier:  fiBandLabel(rank),
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to={`${base}/patients`} className="hover:text-primary transition-colors">Patients</Link>
        {patient && (
          <>
            <span>/</span>
            <Link to={`${base}/patients/${patient.id}`} className="hover:text-primary transition-colors">
              {patient.full_name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-medium text-gray-900">Assessment</span>
      </nav>

      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assessment Result</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatDateTime(assessment.created_at)}
            {patient ? ` · ${patient.full_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={finalRisk} size="md" />
          {patient && (
            <button
              onClick={() => generateAssessmentPDF(assessment, patient, clinicianName)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Age advisory banner */}
      {assessment.age_advisory_shown && assessment.age_advisory && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <span className="text-amber-500 mt-0.5">⚠</span>
          <p className="text-sm text-amber-700">{assessment.age_advisory}</p>
        </div>
      )}

      {/* 1 — Risk gauge */}
      <RiskGauge
        riskLevel={finalRisk}
        confidence={assessment.model_confidence}
        position={pos}
      />

      {/* 2 — Probability + Clinical inputs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SectionBox title="Probability Distribution (Base Model)">
          {adjApplied && baseRisk !== finalRisk && (
            <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              Base model: <strong>{baseRisk}</strong> Risk → Final after symptoms:{' '}
              <strong>{finalRisk}</strong> Risk ↑
            </div>
          )}
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                layout="vertical"
                data={probData}
                margin={{ top: 0, right: 52, bottom: 0, left: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={82}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {probData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                    style={{ fontSize: 11, fontWeight: 600, fill: '#111827' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionBox>

        <SectionBox title="Clinical Inputs">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {([
              { label: 'Age',            value: `${assessment.age} yrs` },
              { label: 'BMI',            value: assessment.bmi.toFixed(1) },
              { label: 'Smoker',         value: assessment.smoker ? 'Yes' : 'No' },
              { label: 'Alcohol',        value: capitalize(assessment.alcohol_consumption) },
              { label: 'Diet',           value: capitalize(assessment.diet_type) },
              { label: 'Activity',       value: capitalize(assessment.physical_activity_level) },
              { label: 'Family Hx Score',value: fhDetail ? fhDetail.score_display : (assessment.family_history_score ?? 0).toFixed(2) + ' / 1.00' },
              { label: 'Regular Checkup',value: assessment.regular_health_checkup ? 'Yes' : 'No' },
              { label: 'Prostate Exam',  value: assessment.prostate_exam_done ? 'Yes' : 'No' },
            ] as { label: string; value: string }[]).map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionBox>
      </div>

      {/* a — Presenting symptoms */}
      <SectionBox title={`a — Presenting Symptoms${presentingSymptoms.length > 0 ? ` (${presentingSymptoms.length} marked Present)` : ''}`}>
        {presentingSymptoms.length > 0 ? (
          <div className="space-y-3">
            {urgentPresentingSymptoms.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                  Urgent Symptom Alert
                </p>
                <p className="mt-1 text-sm text-red-700">
                  High-priority symptoms were recorded for this assessment and should be reviewed promptly.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {urgentPresentingSymptoms.map((symptom) => (
                    <span
                      key={symptom.key}
                      className="inline-flex items-center rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700"
                    >
                      ⚠ {symptom.display}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">
              The following symptoms were marked present for this assessment.
            </p>
            <ul className="space-y-2">
              {presentingSymptoms.map((symptom) => (
                <li
                  key={symptom.key}
                  className={[
                    'flex items-start gap-3 rounded-xl border px-3 py-2 text-sm',
                    symptom.urgent
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-gray-100 bg-white text-gray-800',
                  ].join(' ')}
                >
                  <span className={`mt-1 shrink-0 ${symptom.urgent ? 'text-red-500' : 'text-gray-400'}`}>•</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{symptom.display}</span>
                    {symptom.urgent && (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        High Priority
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-gray-500">No presenting symptoms were marked present for this assessment.</p>
        )}
      </SectionBox>

      {/* b — Assessment summary */}
      <SectionBox title="b — Assessment Summary">
        <AssessmentSummary assessment={assessment} symAdj={symAdj} />
      </SectionBox>

      {/* c — Family history details */}
      {fhDetail && (
        <SectionBox title="c — Family History Details">
          <FamilyHistorySection detail={fhDetail} />
        </SectionBox>
      )}

      <PrimaryRiskFactors assessment={assessment} />

      {/* d — Contributing factors */}
      <SectionBox title="d — Key Contributing Factors">
        <div className="space-y-2">
          {adjApplied && symAdj && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              <strong>Symptom adjustment applied.</strong> {symAdj.adjustment_reason}
            </div>
          )}
          {assessment.top_contributing_factors.map((factor, i) => (
            <FactorRow key={i} factor={factor} index={i + 1} />
          ))}
        </div>
      </SectionBox>

      {/* e — Clinical recommendation */}
      <SectionBox title="e — Clinical Recommendation">
        <p className="text-sm leading-relaxed text-gray-700">
          {assessment.clinical_recommendation}
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Disclaimer</p>
          <p className="text-xs leading-relaxed text-amber-700">
            This is a clinical decision support tool only. It does not diagnose prostate
            cancer. Final clinical decisions rest with the attending health worker.
          </p>
        </div>
      </SectionBox>

      {/* Feature importance — tiered */}
      <SectionBox title="Feature Importance — Model Overview">
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { color: '#b91c1c', label: 'Highest' },
            { color: '#ea580c', label: 'High' },
            { color: '#2563eb', label: 'Moderate' },
            { color: '#93c5fd', label: 'Low' },
          ].map(({ color, label }) => (
            <span key={label} className="inline-flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <div style={{ height: fiData.length * 28 + 8 }}>
          <ResponsiveContainer width="100%" height={fiData.length * 28 + 8}>
            <BarChart
              layout="vertical"
              data={fiData}
              margin={{ top: 0, right: 70, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {fiData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="tier"
                  position="right"
                  style={{ fontSize: 10, fill: '#6b7280' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {adjApplied && symAdj && (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">Symptom Adjustment Applied</p>
            <p className="text-xs text-amber-600 mb-1">{symAdj.adjustment_reason}</p>
            <p className="text-xs text-amber-600">Symptom burden score: <strong>{symAdj.symptom_score.toFixed(2)}</strong></p>
            {symAdj.urgent_symptom_flags.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5">
                {symAdj.urgent_symptom_flags.map((s, i) => (
                  <li key={i} className="text-xs text-amber-600">⚠ {s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionBox>

      {/* Symptom assessment table */}
      <SectionBox title="Presenting Symptoms Assessment">
        <SymptomAssessmentTable rawSymptoms={rawSymptoms} />
      </SectionBox>

      {/* Back link */}
      {patient ? (
        <Link to={`${base}/patients/${patient.id}`} className="btn-outline inline-flex">
          ← Back to Patient
        </Link>
      ) : (
        <button onClick={() => navigate(-1)} className="btn-outline">← Back</button>
      )}

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Assessment summary (structured) ──────────────────────────────────────────

const RELATIVE_LABELS: Record<string, string> = {
  father:               'Father',
  brother:              'Brother',
  paternal_grandfather: 'Paternal Grandfather',
  maternal_grandfather: 'Maternal Grandfather',
}

function formatRelative(key: string): string {
  return RELATIVE_LABELS[key] ?? key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function FamilyHistorySection({ detail }: { detail: FamilyHistoryDetail }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          detail.has_history ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {detail.has_history ? 'History Present' : 'No History'}
        </span>
        <span className="text-sm font-semibold text-gray-700">Score: {detail.score_display}</span>
      </div>
      {(detail.relatives?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {detail.relatives.map((r) => (
            <span key={r} className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
              {formatRelative(r)}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm leading-relaxed text-gray-600">{detail.significance}</p>
    </div>
  )
}

function AssessmentSummary({ assessment, symAdj }: { assessment: Assessment; symAdj: SymptomAdjustment | null }) {
  const hasStructured = assessment.summary_text && assessment.summary_text.length > 0

  const finalRisk  = assessment.final_risk_level ?? assessment.risk_level
  const baseRisk   = assessment.base_risk_level  ?? assessment.risk_level
  const adjApplied = symAdj?.adjustment_applied ?? false

  if (!hasStructured) {
    return <p className="text-sm leading-relaxed text-gray-700">{assessment.risk_explanation}</p>
  }

  const activeCount = assessment.active_risk_factors?.length ?? 0
  const riskLabel   = finalRisk.toUpperCase()

  return (
    <div className="space-y-4">
      {adjApplied && (
        <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 ring-1 ring-amber-200">
          The base model predicted <strong>{baseRisk.toUpperCase()}</strong> risk.
          Presenting symptoms elevated the final risk to <strong>{finalRisk.toUpperCase()}</strong>.
        </div>
      )}
      <p className="text-sm font-medium text-gray-900">
        This patient was assessed as{' '}
        <span className={
          finalRisk === 'High'   ? 'text-red-600 font-semibold' :
          finalRisk === 'Medium' ? 'text-yellow-600 font-semibold' :
                                   'text-green-600 font-semibold'
        }>
          {riskLabel} RISK
        </span>{' '}
        of prostate cancer.
      </p>

      {activeCount > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Active risk factors ({activeCount} of 4)
          </p>
          <ol className="space-y-1">
            {assessment.active_risk_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="shrink-0 font-semibold text-red-500">({i + 1})</span>
                {f}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(assessment.protective_factors?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Protective factors
          </p>
          <ol className="space-y-1">
            {assessment.protective_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <span className="shrink-0 font-semibold text-green-500">({i + 1})</span>
                {f}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-sm leading-relaxed text-gray-700">{assessment.summary_text}</p>

      {(assessment.lifestyle_factor_notes?.length ?? 0) > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Lifestyle &amp; Demographic Factors
          </p>
          {assessment.lifestyle_factor_notes.map((note) => (
            <LifestyleNoteRow key={note.feature} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}

function LifestyleNoteRow({ note }: { note: LifestyleFactorNote }) {
  const increased = note.direction === 'Increased risk'
  return (
    <div className={`rounded-lg px-3.5 py-3 ${
      increased ? 'bg-red-50 ring-1 ring-red-100' : 'bg-green-50 ring-1 ring-green-100'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${increased ? 'text-red-500' : 'text-green-500'}`}>
          {increased ? '▲' : '▼'}
        </span>
        <p className="text-xs font-semibold text-gray-800">{note.label}</p>
        <span className={`ml-auto text-xs ${increased ? 'text-red-600' : 'text-green-600'}`}>
          {note.direction}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-gray-600 pl-4">{note.clinical_note}</p>
    </div>
  )
}

// ── Symptom assessment table ─────────────────────────────────────────────────

const FULL_SYMPTOM_LABELS: { key: string; display: string; urgent?: boolean }[] = [
  { key: 'difficulty_urination', display: 'Difficulty in urination (hesitancy, weak stream)', urgent: true },
  { key: 'increased_frequency',  display: 'Increased urinary frequency (day/night)',          urgent: true },
  { key: 'urinary_retention',    display: 'Urinary retention',    urgent: true },
  { key: 'haematuria',           display: 'Haematuria (blood in urine)', urgent: true },
  { key: 'dysuria',              display: 'Dysuria (painful urination)' },
  { key: 'pelvic_discomfort',    display: 'Lower abdominal/pelvic discomfort' },
  { key: 'perineal_pain',        display: 'Perineal or rectal pain' },
  { key: 'back_pain',            display: 'Back pain (lumbar/sacral)' },
  { key: 'bone_pain',            display: 'Bone pain (generalised or localised)', urgent: true },
  { key: 'leg_weakness',         display: 'Leg weakness or paralysis', urgent: true },
  { key: 'urinary_incontinence', display: 'Urinary incontinence' },
  { key: 'weight_loss',          display: 'Weight loss',          urgent: true },
  { key: 'fatigue',              display: 'Fatigue or generalised body weakness' },
  { key: 'erectile_dysfunction', display: 'Erectile dysfunction' },
  { key: 'others',               display: 'Others (specify)' },
]

function SymptomAssessmentTable({ rawSymptoms }: { rawSymptoms: Record<string, string> | null }) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <p className="text-center text-sm font-semibold text-gray-700 tracking-wide">
        Presenting Symptoms Assessment
      </p>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: '#0d2e45' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white w-[55%]">
                Symptom / Complaint
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white w-[15%]">
                Present
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white w-[15%]">
                Absent
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white w-[15%]">
                Not Documented
              </th>
            </tr>
          </thead>
          <tbody>
            {FULL_SYMPTOM_LABELS.map((sym, idx) => {
              const status  = rawSymptoms?.[sym.key] ?? 'Not Documented'
              const isPresent      = status === 'Present'
              const isAbsent       = status === 'Absent'
              const isNotDoc       = status === 'Not Documented'
              const rowBg          = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              return (
                <tr key={sym.key} className={rowBg}>
                  {/* Symptom label */}
                  <td className="px-4 py-2.5 text-gray-800 font-medium leading-snug">
                    {idx + 1}.{' '}{sym.display}
                    {sym.urgent && (
                      <span className="ml-1.5 text-amber-500" title="High-priority symptom">△</span>
                    )}
                  </td>

                  {/* Present */}
                  <td
                    className="px-4 py-2.5 text-center text-base font-bold"
                    style={isPresent
                      ? { background: '#ef4444', color: '#fff' }
                      : { background: 'transparent', color: '#d1d5db' }
                    }
                  >
                    {isPresent ? '✓' : '○'}
                  </td>

                  {/* Absent */}
                  <td
                    className="px-4 py-2.5 text-center text-base font-bold"
                    style={isAbsent
                      ? { background: '#bbf7d0', color: '#15803d' }
                      : { background: 'transparent', color: '#d1d5db' }
                    }
                  >
                    {isAbsent ? '✓' : '○'}
                  </td>

                  {/* Not Documented */}
                  <td
                    className="px-4 py-2.5 text-center text-base font-bold"
                    style={isNotDoc
                      ? { background: '#fef9c3', color: '#a16207' }
                      : { background: 'transparent', color: '#d1d5db' }
                    }
                  >
                    {isNotDoc ? '✓' : '○'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500">
        <span className="font-medium text-gray-600">△ = High-priority symptom</span>
        {[
          { bg: '#ef4444', label: 'Red = Present' },
          { bg: '#bbf7d0', label: 'Green = Absent' },
          { bg: '#fef9c3', label: 'Yellow = Not Documented' },
        ].map(({ bg, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: bg }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Primary risk factors ──────────────────────────────────────────────────────

const PRIMARY_RISK_FACTORS: {
  label:        string
  isActive:     (a: Assessment) => boolean
  activeText:   string
  inactiveText: string
}[] = [
  {
    label:        'Smoking status',
    isActive:     (a) => a.smoker,
    activeText:   'Active — patient is a smoker',
    inactiveText: 'Not active (non-smoker)',
  },
  {
    label:        'Family history of prostate cancer',
    isActive:     (a) => a.family_history,
    activeText:   'Active — family history present',
    inactiveText: 'Not active (no family history)',
  },
  {
    label:        'Regular health checkup attendance',
    isActive:     (a) => !a.regular_health_checkup,
    activeText:   'Active — no regular checkups attended',
    inactiveText: 'Not active (attends regular checkups)',
  },
  {
    label:        'Prior prostate examination',
    isActive:     (a) => !a.prostate_exam_done,
    activeText:   'Active — no prior examination on record',
    inactiveText: 'Not active (prior examination on record)',
  },
]

function PrimaryRiskFactors({ assessment }: { assessment: Assessment }) {
  const resolved = PRIMARY_RISK_FACTORS.map((f) => ({ ...f, active: f.isActive(assessment) }))
  const activeCount = resolved.filter((f) => f.active).length

  return (
    <SectionBox title={`Primary Risk Factors Assessed (${activeCount} of 4 active)`}>
      <div className="space-y-2">
        {resolved.map(({ label, active, activeText, inactiveText }) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 ${
              active ? 'bg-red-50 ring-1 ring-red-100' : 'bg-green-50 ring-1 ring-green-100'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                active ? 'bg-red-500' : 'bg-green-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className={`text-xs ${active ? 'text-red-600' : 'text-green-600'}`}>
                {active ? activeText : inactiveText}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

function RiskGauge({
  riskLevel,
  confidence,
  position,
}: {
  riskLevel:  string
  confidence: number
  position:   number
}) {
  const theme = {
    Low:    { ring: 'ring-green-200',  bg: 'bg-green-50',  text: 'text-green-700'  },
    Medium: { ring: 'ring-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    High:   { ring: 'ring-red-200',    bg: 'bg-red-50',    text: 'text-red-700'    },
  }
  const t       = theme[riskLevel as keyof typeof theme] ?? theme.High
  const needleX = Math.min(Math.max(position, 1.5), 98.5)

  return (
    <div className={`rounded-xl ring-1 px-5 py-4 ${t.bg} ${t.ring}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Patient Risk Level Assessment
        </p>
        <span className={`text-sm font-bold ${t.text}`}>
          {riskLevel.toUpperCase()} RISK &mdash; {confidence.toFixed(1)}% confidence
        </span>
      </div>

      <div className="relative pt-2 pb-5">
        <div
          className="h-5 w-full rounded-full overflow-hidden"
          style={{
            background:
              'linear-gradient(to right, #22c55e, #86efac 30%, #facc15 50%, #fb923c 70%, #ef4444)',
          }}
        />
        <div
          className="pointer-events-none absolute top-0 flex flex-col items-center"
          style={{ left: `${needleX}%`, transform: 'translateX(-50%)' }}
        >
          <div className="h-8 w-0.5 rounded bg-gray-900" />
          <svg width="10" height="6" viewBox="0 0 10 6" className="-mt-px">
            <polygon points="0,0 10,0 5,6" fill="#111827" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-semibold">
          <span className="text-green-600">LOW</span>
          <span className="text-yellow-600">MEDIUM</span>
          <span className="text-red-600">HIGH</span>
        </div>
      </div>
    </div>
  )
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        {title}
      </h2>
      {children}
    </div>
  )
}

function FactorRow({ factor, index }: { factor: ContributingFactor; index: number }) {
  const increased = factor.direction === 'Increased risk'
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3.5 py-3 ${
        increased ? 'bg-red-50 ring-1 ring-red-100' : 'bg-green-50 ring-1 ring-green-100'
      }`}
    >
      <span className={`mt-0.5 shrink-0 text-sm font-bold ${increased ? 'text-red-500' : 'text-green-500'}`}>
        {increased ? '▲' : '▼'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{index}. {factor.factor}</p>
        <p className={`mt-0.5 text-xs ${increased ? 'text-red-600' : 'text-green-600'}`}>
          {factor.strength} &mdash; {factor.direction}
        </p>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      <div className="h-5 w-64 rounded bg-gray-100" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-gray-100" />
          <div className="h-3 w-28 rounded bg-gray-100" />
        </div>
        <div className="h-7 w-16 rounded-full bg-gray-100" />
      </div>
      <div className="h-24 rounded-xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-5">
        <div className="h-40 rounded-2xl bg-gray-100" />
        <div className="h-40 rounded-2xl bg-gray-100" />
      </div>
      {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
    </div>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
