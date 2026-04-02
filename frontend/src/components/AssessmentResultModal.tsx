import type { Assessment } from '../types'
import RiskBadge from './RiskBadge'

interface Props {
  assessment: Assessment
  onClose:    () => void
}

const BAR_CONFIG = [
  { label: 'Low Risk',    key: 'low_percentage'    as const, color: 'bg-green-500'  },
  { label: 'Medium Risk', key: 'medium_percentage' as const, color: 'bg-yellow-400' },
  { label: 'High Risk',   key: 'high_percentage'   as const, color: 'bg-red-500'    },
]

export default function AssessmentResultModal({ assessment, onClose }: Props) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assessment Complete</h2>
            <p className="mt-0.5 text-xs text-gray-500">Prostate cancer risk prediction result</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Risk level */}
          <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 py-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Predicted Risk Level
            </p>
            <RiskBadge level={assessment.risk_level} size="lg" />
          </div>

          {/* Probability breakdown */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Probability Breakdown
            </p>
            <div className="space-y-3">
              {BAR_CONFIG.map(({ label, key, color }) => {
                const pct = assessment[key]
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Key features summary */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Key Factors Recorded
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <FactRow label="BMI"           value={assessment.bmi.toFixed(1)} />
              <FactRow label="Smoker"        value={assessment.smoker ? 'Yes' : 'No'} />
              <FactRow label="Diet type"     value={capitalize(assessment.diet_type)} />
              <FactRow label="Activity"      value={capitalize(assessment.physical_activity_level)} />
              <FactRow label="Family Hx"     value={assessment.family_history ? 'Yes' : 'No'} />
              <FactRow label="Prostate exam" value={assessment.prostate_exam_done ? 'Yes' : 'No'} />
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="btn-primary flex-1">
            View Patient Record
          </button>
        </div>
      </div>
    </div>
  )
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
