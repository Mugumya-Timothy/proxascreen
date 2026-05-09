import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type {
  Assessment,
  ContributingFactor,
  LifestyleFactorNote,
  FamilyHistoryDetail,
  SymptomAdjustment,
  RiskLevel,
} from '../types'
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
    key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  )
}

// Tier colour for feature importance bars
function fiBandColor(importance: number, rank: number): string {
  if (rank === 0) return '#b91c1c'  // deep red — Highest
  if (rank <= 2)  return '#ea580c'  // orange   — High
  if (rank <= 5)  return '#2563eb'  // blue     — Moderate
  return '#93c5fd'                  // light blue — Low
}

function fiBandLabel(rank: number): string {
  if (rank === 0)  return 'Highest'
  if (rank <= 2)   return 'High'
  if (rank <= 5)   return 'Moderate'
  return 'Low'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessmentResultModal({ assessment, onClose }: Props) {
  // Ineligible case — age gate blocked
  if (assessment.eligible === false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚫</span>
            <h2 className="text-lg font-bold text-gray-900">Assessment Blocked</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {assessment.blocked_reason ?? 'This patient is not eligible for prostate cancer risk assessment.'}
          </p>
          <button onClick={onClose} className="btn-primary mt-5 w-full">Close</button>
        </div>
      </div>
    )
  }

  const symAdj      = assessment.symptom_adjustment as SymptomAdjustment | null
  const fhDetail    = assessment.family_history_detail as FamilyHistoryDetail | null
  const rawSymptoms = assessment.raw_symptom_dict as Record<string, string> | null

  const baseRisk  = (assessment.base_risk_level ?? assessment.risk_level) as RiskLevel
  const finalRisk = (assessment.final_risk_level ?? assessment.risk_level) as RiskLevel
  const adjApplied = symAdj?.adjustment_applied ?? false

  const pos = riskPosition(
    assessment.low_percentage,
    assessment.medium_percentage,
    assessment.high_percentage,
  )

  // Probability bars — always show BASE model probabilities
  const probData = [
    { name: 'High Risk',   value: assessment.high_percentage,   fill: '#ef4444' },
    { name: 'Medium Risk', value: assessment.medium_percentage, fill: '#facc15' },
    { name: 'Low Risk',    value: assessment.low_percentage,    fill: '#22c55e' },
  ]

  // Feature importance — tiered colour, no decimals as labels
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-5xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">

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
            <RiskBadge level={finalRisk} size="md" />
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

          {/* Age advisory banner */}
          {assessment.age_advisory_shown && assessment.age_advisory && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <p className="text-sm text-amber-700">{assessment.age_advisory}</p>
            </div>
          )}

          {/* Urgent symptom alert */}
          <UrgentSymptomAlert rawSymptoms={rawSymptoms} />

          {/* Risk gauge */}
          <RiskGauge
            riskLevel={finalRisk}
            confidence={assessment.model_confidence}
            position={pos}
          />

          {/* Probability + Key inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionBox title="Probability Distribution (Base Model)">
              {adjApplied && baseRisk !== finalRisk && (
                <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                  Base model: <strong>{baseRisk}</strong> Risk → Final after symptoms:{' '}
                  <strong>{finalRisk}</strong> Risk ↑
                </div>
              )}
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
                  { label: 'BMI',              value: assessment.bmi.toFixed(1) },
                  { label: 'Smoker',           value: assessment.smoker ? 'Yes' : 'No' },
                  { label: 'Alcohol',          value: capitalize(assessment.alcohol_consumption) },
                  { label: 'Diet',             value: capitalize(assessment.diet_type) },
                  { label: 'Activity',         value: capitalize(assessment.physical_activity_level) },
                  { label: 'Family Hx Score',  value: fhDetail ? fhDetail.score_display : (assessment.family_history_score ?? 0).toFixed(2) + ' / 1.00' },
                  { label: 'Prostate Exam',    value: assessment.prostate_exam_done ? 'Yes' : 'No' },
                ] as const).map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                  >
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">{value as string}</span>
                  </div>
                ))}
              </dl>
            </SectionBox>
          </div>

          {/* a — Assessment Summary */}
          <SectionBox title="a — Assessment Summary">
            <AssessmentSummary assessment={assessment} symAdj={symAdj} />
          </SectionBox>

          {/* b — Family History Details */}
          {fhDetail && (
            <SectionBox title="b — Family History Details">
              <FamilyHistorySection detail={fhDetail} />
            </SectionBox>
          )}

          {/* c — Key Contributing Factors */}
          <SectionBox title="c — Key Contributing Factors">
            <div className="space-y-2">
              {adjApplied && symAdj && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                  <strong>Symptom adjustment applied.</strong>{' '}
                  {symAdj.adjustment_reason}
                </div>
              )}
              {assessment.top_contributing_factors.map((factor, i) => (
                <FactorRow key={i} factor={factor} index={i + 1} />
              ))}
            </div>
          </SectionBox>

          {/* d — Clinical Recommendation */}
          <SectionBox title="d — Clinical Recommendation">
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

          {/* Panel 3 — Feature Importance (tiered) */}
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
              <ResponsiveContainer width="100%" height="100%">
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

            {/* Symptom adjustment sub-section inside Panel 3 */}
            {adjApplied && symAdj && (
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">
                  Symptom Adjustment Applied
                </p>
                <p className="text-xs text-amber-600 mb-2">{symAdj.adjustment_reason}</p>
                <p className="text-xs text-amber-600">
                  Symptom burden score: <strong>{symAdj.symptom_score.toFixed(2)}</strong>
                </p>
                {symAdj.urgent_symptom_flags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-amber-700">Urgent symptoms flagged:</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {symAdj.urgent_symptom_flags.map((s, i) => (
                        <li key={i} className="text-xs text-amber-600">⚠ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </SectionBox>

          {/* Panel 4 — Symptom Heatmap */}
          <SectionBox title="Presenting Symptoms Heatmap">
            {rawSymptoms && Object.keys(rawSymptoms).length > 0 ? (
              <SymptomHeatmap rawSymptomDict={rawSymptoms} urgentFlags={symAdj?.urgent_symptom_flags ?? []} />
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No Presenting Symptoms Recorded</p>
            )}
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

// ── Urgent symptom alert ──────────────────────────────────────────────────────

const URGENT_SYMPTOM_KEYS = new Set([
  'urinary_retention', 'haematuria', 'bone_pain', 'leg_weakness',
])

const URGENT_DISPLAY_LABELS: Record<string, string> = {
  urinary_retention: 'Urinary retention',
  haematuria:        'Haematuria (blood in urine)',
  bone_pain:         'Bone pain (generalised or localised)',
  leg_weakness:      'Leg weakness or paralysis',
}

function UrgentSymptomAlert({ rawSymptoms }: { rawSymptoms: Record<string, string> | null }) {
  if (!rawSymptoms) return null
  const urgent = Object.entries(rawSymptoms)
    .filter(([key, status]) => URGENT_SYMPTOM_KEYS.has(key) && status === 'Present')
    .map(([key]) => URGENT_DISPLAY_LABELS[key] ?? key)
  if (urgent.length === 0) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
        Urgent Symptom Alert
      </p>
      <p className="mt-1 text-sm text-red-700">
        High-priority symptoms were recorded for this assessment and should be reviewed promptly.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {urgent.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700"
          >
            ⚠ {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Assessment Summary (Section a) ────────────────────────────────────────────

function AssessmentSummary({
  assessment,
  symAdj,
}: {
  assessment: Assessment
  symAdj: SymptomAdjustment | null
}) {
  const adjApplied  = symAdj?.adjustment_applied ?? false
  const baseRisk    = assessment.base_risk_level ?? assessment.risk_level
  const finalRisk   = assessment.final_risk_level ?? assessment.risk_level
  const activeCount = assessment.active_risk_factors?.length ?? 0
  const riskLabel   = finalRisk.toUpperCase()

  return (
    <div className="space-y-4">
      {adjApplied && (
        <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 ring-1 ring-amber-200">
          The base model predicted <strong>{baseRisk.toUpperCase()}</strong> risk based on
          clinical features. Presenting symptoms elevated the final risk to{' '}
          <strong>{finalRisk.toUpperCase()}</strong>.
        </div>
      )}

      <p className="text-sm font-medium text-gray-900">
        This patient was assessed as{' '}
        <span className={
          finalRisk === 'High'   ? 'font-bold text-red-600' :
          finalRisk === 'Medium' ? 'font-bold text-yellow-600' :
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

// ── Family History Section (Section b) ───────────────────────────────────────

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
          detail.has_history
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {detail.has_history ? 'History Present' : 'No History'}
        </span>
        <span className="text-sm font-semibold text-gray-700">Score: {detail.score_display}</span>
      </div>

      {detail.relatives.length > 0 && (
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

// ── Lifestyle factor note row ─────────────────────────────────────────────────

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

// ── Symptom Heatmap (Panel 4) ─────────────────────────────────────────────────

const SYMPTOM_ORDER: { key: string; display: string; urgent?: boolean }[] = [
  { key: 'difficulty_urination', display: 'Difficulty urination' },
  { key: 'increased_frequency',  display: 'Increased frequency' },
  { key: 'urinary_retention',    display: 'Urinary retention',      urgent: true },
  { key: 'haematuria',           display: 'Haematuria',             urgent: true },
  { key: 'dysuria',              display: 'Dysuria' },
  { key: 'pelvic_discomfort',    display: 'Pelvic discomfort' },
  { key: 'perineal_pain',        display: 'Perineal/rectal pain' },
  { key: 'back_pain',            display: 'Back pain' },
  { key: 'bone_pain',            display: 'Bone pain',             urgent: true },
  { key: 'leg_weakness',         display: 'Leg weakness',          urgent: true },
  { key: 'urinary_incontinence', display: 'Urinary incontinence' },
  { key: 'weight_loss',          display: 'Weight loss' },
  { key: 'fatigue',              display: 'Fatigue' },
  { key: 'erectile_dysfunction', display: 'Erectile dysfunction' },
  { key: 'others',               display: 'Others' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  'Present':       { bg: 'bg-red-100',         text: 'text-red-700',    label: 'Present'        },
  'Absent':        { bg: 'bg-green-50',         text: 'text-green-700',  label: 'Absent'         },
  'Not Documented':{ bg: 'bg-yellow-50',        text: 'text-yellow-700', label: 'Not Documented' },
}

function SymptomHeatmap({
  rawSymptomDict,
  urgentFlags,
}: {
  rawSymptomDict: Record<string, string>
  urgentFlags:    string[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="pb-2 pr-3 w-full">Symptom</th>
            <th className="pb-2 px-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {SYMPTOM_ORDER.map((sym) => {
            const status = rawSymptomDict[sym.key] ?? 'Not Documented'
            const style  = STATUS_STYLE[status] ?? STATUS_STYLE['Not Documented']
            const isUrgentFlagged = sym.urgent && status === 'Present'
            return (
              <tr key={sym.key} className="hover:bg-gray-50/50">
                <td className="py-1.5 pr-3 text-gray-700 leading-snug">
                  {sym.urgent && <span className="mr-1 text-amber-500" title="High-priority">⚠</span>}
                  {sym.display}
                  {isUrgentFlagged && (
                    <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      URGENT
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center">
                  <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Risk gauge ────────────────────────────────────────────────────────────────

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
        <div
          className="h-6 w-full overflow-hidden rounded-full shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #22c55e, #86efac 30%, #facc15 50%, #fb923c 70%, #ef4444)',
          }}
        />
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2"
          style={{ left: `${needleX}%` }}
        >
          <div className="mx-auto h-7 w-0.5 rounded-full bg-gray-900 shadow" />
          <svg width="8" height="5" viewBox="0 0 8 5" className="mx-auto -mt-0.5">
            <polygon points="0,0 8,0 4,5" fill="#111827" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-bold">
          <span className="text-green-600">LOW</span>
          <span className="text-yellow-600">MEDIUM</span>
          <span className="text-red-600">HIGH</span>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
