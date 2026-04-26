import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { Assessment, ContributingFactor, LifestyleFactorNote } from '../types'
import RiskBadge from './RiskBadge'

interface Props {
  assessment: Assessment
  onClose:    () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessmentResultModal({ assessment, onClose }: Props) {
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

  const fiEntries = Object.entries(assessment.feature_importances).sort(
    (a, b) => b[1] - a[1],
  )
  const top3Keys = new Set(fiEntries.slice(0, 3).map(([k]) => k))
  const fiData = fiEntries.map(([key, val]) => ({
    name:  featureLabel(key),
    value: val,
    fill:  top3Keys.has(key) ? '#ef4444' : '#5FB0E3',
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">

        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-center justify-between rounded-t-2xl px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ChartIcon className="h-5 w-5 text-white/80" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Assessment Complete</h2>
              <p className="mt-0.5 text-xs text-white/55">Prostate cancer risk prediction result</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge level={assessment.risk_level} size="md" />
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">

          {/* 1 — Risk gauge */}
          <RiskGauge
            riskLevel={assessment.risk_level}
            confidence={assessment.model_confidence}
            position={pos}
          />

          {/* 2 — Probability + Key inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionBox title="Probability Distribution">
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
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
                        style={{ fontSize: 11, fontWeight: 700, fill: '#111827' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionBox>

            <SectionBox title="Key Inputs Recorded">
              <dl className="space-y-1.5">
                {([
                  { label: 'BMI',           value: assessment.bmi.toFixed(1) },
                  { label: 'Smoker',        value: assessment.smoker ? 'Yes' : 'No' },
                  { label: 'Alcohol',       value: capitalize(assessment.alcohol_consumption) },
                  { label: 'Diet',          value: capitalize(assessment.diet_type) },
                  { label: 'Activity',      value: capitalize(assessment.physical_activity_level) },
                  { label: 'Family Hx',     value: assessment.family_history ? 'Yes' : 'No' },
                  { label: 'Prostate Exam', value: assessment.prostate_exam_done ? 'Yes' : 'No' },
                ] as const).map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                  >
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </dl>
            </SectionBox>
          </div>

          {/* 3 — Assessment summary */}
          <SectionBox title="Assessment Summary">
            <AssessmentSummary assessment={assessment} />
          </SectionBox>

          {/* 4 — Primary risk factors */}
          <PrimaryRiskFactors assessment={assessment} />

          {/* 5 — Contributing factors */}
          <SectionBox title="Key Contributing Factors">
            <div className="space-y-2">
              {assessment.top_contributing_factors.map((factor, i) => (
                <FactorRow key={i} factor={factor} index={i + 1} />
              ))}
            </div>
          </SectionBox>

          {/* 6 — Feature importance chart */}
          <SectionBox title="Feature Importance — Overall Model">
            <p className="mb-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                Top 3 most influential features
              </span>
            </p>
            <div style={{ height: fiData.length * 26 + 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={fiData}
                  margin={{ top: 0, right: 52, bottom: 0, left: 0 }}
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
                      dataKey="value"
                      position="right"
                      formatter={(v: unknown) => Number(v).toFixed(3)}
                      style={{ fontSize: 10, fill: '#6b7280' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionBox>

          {/* 7 — Clinical recommendation */}
          <SectionBox title="Clinical Recommendation">
            <p className="text-sm leading-relaxed text-gray-700">
              {assessment.clinical_recommendation}
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-amber-200">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                  Clinical Disclaimer
                </p>
              </div>
              <div className="bg-amber-50/50 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-700">
                  This is a clinical decision support tool only. It does not diagnose prostate
                  cancer. Final clinical decisions rest with the attending health worker.
                </p>
              </div>
            </div>
          </SectionBox>

        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="btn-primary w-full">
            View Patient Record
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Assessment summary ────────────────────────────────────────────────────────

function AssessmentSummary({ assessment }: { assessment: Assessment }) {
  const hasStructured = assessment.summary_text && assessment.summary_text.length > 0

  if (!hasStructured) {
    return <p className="text-sm leading-relaxed text-gray-700">{assessment.risk_explanation}</p>
  }

  const activeCount = assessment.active_risk_factors?.length ?? 0
  const riskLabel   = assessment.risk_level.toUpperCase()

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-900">
        This patient was assessed as{' '}
        <span className={
          assessment.risk_level === 'High'   ? 'font-bold text-red-600' :
          assessment.risk_level === 'Medium' ? 'font-bold text-yellow-600' :
                                               'font-bold text-green-600'
        }>
          {riskLabel} RISK
        </span>{' '}
        of prostate cancer.
      </p>

      {activeCount > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Active risk factors ({activeCount} of 4)
          </p>
          <ol className="space-y-1.5">
            {assessment.active_risk_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border-l-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
                <span className="shrink-0 font-bold text-red-500">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(assessment.protective_factors?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Protective factors
          </p>
          <ol className="space-y-1.5">
            {assessment.protective_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border-l-2 border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
                <span className="shrink-0 font-bold text-green-500">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-sm leading-relaxed text-gray-700">{assessment.summary_text}</p>

      {(assessment.lifestyle_factor_notes?.length ?? 0) > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
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
    <div className={`overflow-hidden rounded-lg border-l-2 ${
      increased ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'
    }`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`text-xs font-bold ${increased ? 'text-red-500' : 'text-green-500'}`}>
          {increased ? '▲' : '▼'}
        </span>
        <p className="text-xs font-semibold text-gray-800">{note.label}</p>
        <span className={`ml-auto text-xs font-medium ${increased ? 'text-red-600' : 'text-green-600'}`}>
          {note.direction}
        </span>
      </div>
      <p className="border-t border-black/5 px-3 py-2 text-xs leading-relaxed text-gray-600">
        {note.clinical_note}
      </p>
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
  const resolved   = PRIMARY_RISK_FACTORS.map((f) => ({ ...f, active: f.isActive(assessment) }))
  const activeCount = resolved.filter((f) => f.active).length

  return (
    <SectionBox title={`Primary Risk Factors Assessed (${activeCount} of 4 active)`}>
      <div className="space-y-2">
        {resolved.map(({ label, active, activeText, inactiveText }) => (
          <div
            key={label}
            className={`flex items-center gap-3 overflow-hidden rounded-lg border-l-2 px-3 py-2.5 ${
              active
                ? 'border-red-400 bg-red-50'
                : 'border-green-400 bg-green-50'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-red-500' : 'bg-green-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
    Low:    { ring: 'ring-green-200',  bg: 'bg-green-50',  text: 'text-green-700',  label: 'text-green-800'  },
    Medium: { ring: 'ring-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'text-yellow-800' },
    High:   { ring: 'ring-red-200',    bg: 'bg-red-50',    text: 'text-red-700',    label: 'text-red-800'    },
  }
  const t       = theme[riskLevel as keyof typeof theme] ?? theme.High
  const needleX = Math.min(Math.max(position, 1.5), 98.5)

  return (
    <div className={`overflow-hidden rounded-xl ring-1 px-5 py-4 ${t.bg} ${t.ring}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
          Patient Risk Level Assessment
        </p>
        <span className={`text-sm font-bold ${t.text}`}>
          {riskLevel.toUpperCase()} RISK &mdash; {confidence.toFixed(1)}% confidence
        </span>
      </div>

      {/* Gauge */}
      <div className="relative pb-6 pt-1">
        {/* Track */}
        <div
          className="h-6 w-full overflow-hidden rounded-full shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #22c55e, #86efac 30%, #facc15 50%, #fb923c 70%, #ef4444)',
          }}
        />
        {/* Needle */}
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2"
          style={{ left: `${needleX}%` }}
        >
          <div className="mx-auto h-7 w-0.5 rounded-full bg-gray-900 shadow" />
          <svg width="8" height="5" viewBox="0 0 8 5" className="mx-auto -mt-0.5">
            <polygon points="0,0 8,0 4,5" fill="#111827" />
          </svg>
        </div>

        {/* Zone labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-bold">
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
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

function FactorRow({ factor, index }: { factor: ContributingFactor; index: number }) {
  const increased = factor.direction === 'Increased risk'
  return (
    <div className={`flex items-start gap-3 overflow-hidden rounded-lg border-l-2 px-3 py-2.5 ${
      increased ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'
    }`}>
      <span className={`mt-0.5 shrink-0 text-sm font-bold ${increased ? 'text-red-500' : 'text-green-500'}`}>
        {increased ? '▲' : '▼'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">
          {index}. {factor.factor}
        </p>
        <p className={`mt-0.5 text-xs ${increased ? 'text-red-600' : 'text-green-600'}`}>
          {factor.strength} &mdash; {factor.direction}
        </p>
      </div>
    </div>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
