import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import RiskBadge from '../../components/RiskBadge'
import { usePatient } from '../../hooks/usePatients'
import { generateAssessmentPDF } from '../../utils/generatePDF'
import type { Assessment, Patient } from '../../types'

export default function PatientDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = pathname.startsWith('/admin') ? '/admin' : ''

  const { user } = useUser()
  const clinicianName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Unknown Clinician'

  const { data: patient, isLoading, isError } = usePatient(id)

  if (isLoading) return <PageSkeleton />

  if (isError || !patient) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-outline text-sm">← Back</button>
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Patient not found or failed to load.
        </div>
      </div>
    )
  }

  const assessments = patient.assessments ?? []

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={`${base}/patients`} className="hover:text-primary transition-colors">Patients</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{patient.full_name}</span>
      </nav>

      {/* Patient info card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{patient.full_name}</h1>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {patient.patient_number}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Age {patient.age} · Submitted {formatDate(patient.date_of_submission)}
              </p>
            </div>
          </div>
          <Link to={`${base}/patients/${patient.id}/assessments/new`} className="btn-primary shrink-0">
            + New Assessment
          </Link>
        </div>

        {/* Info grid */}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-4">
          <InfoItem label="Patient ID"      value={patient.patient_number} />
          <InfoItem label="Age"             value={`${patient.age} years`} />
          <InfoItem label="Date Submitted"  value={formatDate(patient.date_of_submission)} />
          <InfoItem label="Assessments"     value={String(assessments.length)} />
        </dl>
      </div>

      {/* Assessments section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Assessment History</h2>

        {assessments.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-400">No assessments yet.</p>
            <Link to={`${base}/patients/${patient.id}/assessments/new`} className="btn-primary mt-4 inline-flex">
              Run First Assessment
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {['Date', 'Risk Level', 'Low %', 'Medium %', 'High %', 'BMI', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assessments.map((a) => (
                  <AssessmentRow key={a.id} assessment={a} patient={patient} clinicianName={clinicianName} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Assessment table row ──────────────────────────────────────────────────────

function AssessmentRow({ assessment: a, patient, clinicianName }: { assessment: Assessment; patient: Patient; clinicianName: string }) {
  const handleDownloadPDF = () => generateAssessmentPDF(a, patient, clinicianName)

  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
        {formatDateTime(a.created_at)}
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <RiskBadge level={a.risk_level} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-green-600 font-medium tabular-nums">
        {a.low_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-yellow-600 font-medium tabular-nums">
        {a.medium_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-red-600 font-medium tabular-nums">
        {a.high_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
        {a.bmi.toFixed(1)}
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          PDF
        </button>
      </td>
    </tr>
  )
}

// ── Helpers & sub-components ──────────────────────────────────────────────────

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
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-40 rounded bg-gray-100" />
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
        <div className="flex gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gray-100" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-gray-100" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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
