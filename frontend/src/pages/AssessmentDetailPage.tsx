import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import RiskBadge from '../components/RiskBadge'
import { useAssessment } from '../hooks/useAssessments'
import { usePatient } from '../hooks/usePatients'
import { generateAssessmentPDF } from '../utils/generatePDF'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = pathname.startsWith('/admin') ? '/admin' : ''
  const { user } = useUser()
  const clinicianName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Unknown Clinician'

  const { data: assessment, isLoading: assessmentLoading, isError: assessmentError } = useAssessment(id)

  // Load the patient only once we have the assessment's patient_id
  const { data: patient, isLoading: patientLoading } = usePatient(assessment?.patient_id)

  const isLoading = assessmentLoading || (!!assessment && patientLoading)

  if (isLoading) return <PageSkeleton />

  if (assessmentError || !assessment) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-outline text-sm">← Back</button>
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Assessment not found or failed to load. It may have been removed.
        </div>
      </div>
    )
  }

  const BAR_CONFIG = [
    { label: 'Low Risk',    key: 'low_percentage'    as const, color: 'bg-green-500'  },
    { label: 'Medium Risk', key: 'medium_percentage' as const, color: 'bg-yellow-400' },
    { label: 'High Risk',   key: 'high_percentage'   as const, color: 'bg-red-500'    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-8">

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
        <span className="text-gray-900 font-medium">Assessment</span>
      </nav>

      {/* Risk summary card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assessment Result</h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatDateTime(assessment.created_at)}
              {patient ? ` · ${patient.full_name}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={assessment.risk_level} />
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

        {/* Probability bars */}
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
      </div>

      {/* Clinical inputs */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Clinical Inputs</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoItem label="Age"              value={`${assessment.age} years`} />
          <InfoItem label="BMI"              value={assessment.bmi.toFixed(1)} />
          <InfoItem label="Smoker"           value={assessment.smoker ? 'Yes' : 'No'} />
          <InfoItem label="Diet Type"        value={capitalize(assessment.diet_type)} />
          <InfoItem label="Physical Activity" value={capitalize(assessment.physical_activity_level)} />
          <InfoItem label="Family History"   value={assessment.family_history ? 'Yes' : 'No'} />
          <InfoItem label="Regular Checkup"  value={assessment.regular_health_checkup ? 'Yes' : 'No'} />
          <InfoItem label="Prostate Exam"    value={assessment.prostate_exam_done ? 'Yes' : 'No'} />
        </dl>
      </div>

      {/* Back link */}
      {patient ? (
        <Link to={`/patients/${patient.id}`} className="btn-outline inline-flex">
          ← Back to Patient
        </Link>
      ) : (
        <button onClick={() => navigate(-1)} className="btn-outline">← Back</button>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-pulse">
      <div className="h-5 w-64 rounded bg-gray-100" />
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-gray-100" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
          <div className="h-7 w-16 rounded-full bg-gray-100" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-20 rounded bg-gray-100" />
              <div className="h-2.5 w-full rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="h-4 w-28 rounded bg-gray-100 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="h-4 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
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

