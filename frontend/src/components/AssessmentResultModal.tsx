import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { Assessment, ContributingFactor } from '../types'
import RiskBadge from './RiskBadge'

interface Props {
  assessment: Assessment
  onClose:    () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Weighted position 0–100: where on the Low→High spectrum this patient sits.
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

  // Probability chart — highest risk shown at top
  const probData = [
    { name: 'High Risk',   value: assessment.high_percentage,   fill: '#ef4444' },
    { name: 'Medium Risk', value: assessment.medium_percentage, fill: '#facc15' },
    { name: 'Low Risk',    value: assessment.low_percentage,    fill: '#22c55e' },
  ]

  // Feature importance chart — sorted descending, top 3 highlighted red
  const fiEntries = Object.entries(assessment.feature_importances).sort(
    (a, b) => b[1] - a[1],
  )
  const top3Keys = new Set(fiEntries.slice(0, 3).map(([k]) => k))
  const fiData = fiEntries.map(([key, val]) => ({
    name:  featureLabel(key),
    value: val,
    fill:  top3Keys.has(key) ? '#ef4444' : '#3b82f6',
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assessment Complete</h2>
            <p className="mt-0.5 text-xs text-gray-500">Prostate cancer risk prediction result</p>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge level={assessment.risk_level} size="md" />
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* 1 — Risk gauge */}
          <RiskGauge
            riskLevel={assessment.risk_level}
            confidence={assessment.model_confidence}
            position={pos}
          />

          {/* 2 — Probability + Key inputs (two columns) */}
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
                        style={{ fontSize: 11, fontWeight: 600, fill: '#111827' }}
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
                  { label: 'Prostate exam', value: assessment.prostate_exam_done ? 'Yes' : 'No' },
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
            <p className="text-sm leading-relaxed text-gray-700">
              {assessment.risk_explanation}
            </p>
          </SectionBox>

          {/* 4 — Contributing factors */}
          <SectionBox title="Key Contributing Factors">
            <div className="space-y-2">
              {assessment.top_contributing_factors.map((factor, i) => (
                <FactorRow key={i} factor={factor} index={i + 1} />
              ))}
            </div>
          </SectionBox>

          {/* 5 — Feature importance chart */}
          <SectionBox title="Feature Importance — Overall Model">
            <p className="mb-3 text-xs text-gray-400">
              Red = Top 3 most influential features
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

          {/* 6 — Clinical recommendation */}
          <SectionBox title="Clinical Recommendation">
            <p className="text-sm leading-relaxed text-gray-700">
              {assessment.clinical_recommendation}
            </p>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                Disclaimer
              </p>
              <p className="text-xs leading-relaxed text-amber-700">
                This is a clinical decision support tool only. It does not diagnose prostate
                cancer. Final clinical decisions rest with the attending health worker.
              </p>
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
    Low:    { ring: 'ring-green-200',  bg: 'bg-green-50',  text: 'text-green-700'  },
    Medium: { ring: 'ring-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    High:   { ring: 'ring-red-200',    bg: 'bg-red-50',    text: 'text-red-700'    },
  }
  const t        = theme[riskLevel as keyof typeof theme] ?? theme.High
  const needleX  = Math.min(Math.max(position, 1.5), 98.5)

  return (
    <div className={`rounded-xl ring-1 px-5 py-4 ${t.bg} ${t.ring}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Patient Risk Level Assessment
        </p>
        <span className={`text-sm font-bold ${t.text}`}>
          {riskLevel.toUpperCase()} RISK &mdash; {confidence.toFixed(1)}% confidence
        </span>
      </div>

      {/* Gradient strip */}
      <div className="relative pt-2 pb-5">
        <div
          className="h-5 w-full rounded-full overflow-hidden"
          style={{
            background:
              'linear-gradient(to right, #22c55e, #86efac 30%, #facc15 50%, #fb923c 70%, #ef4444)',
          }}
        />
        {/* Needle indicator */}
        <div
          className="pointer-events-none absolute top-0 flex flex-col items-center"
          style={{ left: `${needleX}%`, transform: 'translateX(-50%)' }}
        >
          <div className="h-8 w-0.5 rounded bg-gray-900" />
          <svg width="10" height="6" viewBox="0 0 10 6" className="-mt-px">
            <polygon points="0,0 10,0 5,6" fill="#111827" />
          </svg>
        </div>

        {/* Zone labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-semibold">
          <span className="text-green-600">LOW</span>
          <span className="text-yellow-600">MEDIUM</span>
          <span className="text-red-600">HIGH</span>
        </div>
      </div>
    </div>
  )
}

function SectionBox({
  title,
  children,
}: {
  title:    string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  )
}

function FactorRow({
  factor,
  index,
}: {
  factor: ContributingFactor
  index:  number
}) {
  const increased = factor.direction === 'Increased risk'
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3.5 py-3 ${
        increased
          ? 'bg-red-50 ring-1 ring-red-100'
          : 'bg-green-50 ring-1 ring-green-100'
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 text-sm font-bold ${
          increased ? 'text-red-500' : 'text-green-500'
        }`}
      >
        {increased ? '▲' : '▼'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {index}. {factor.factor}
        </p>
        <p
          className={`mt-0.5 text-xs ${
            increased ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {factor.strength} &mdash; {factor.direction}
        </p>
      </div>
    </div>
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
