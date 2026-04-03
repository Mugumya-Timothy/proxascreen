import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '@clerk/clerk-react'
import RiskBadge from './RiskBadge'
import NewAssessmentModal from './NewAssessmentModal'
import { usePatient } from '../hooks/usePatients'
import { generateAssessmentPDF } from '../utils/generatePDF'
import type { Assessment, Patient, RiskLevel } from '../types'

export default function PatientDetailModal({
  patientId,
  base = '',
  onClose,
}: {
  patientId: string
  base?: string
  onClose: () => void
}) {
  const [showNewAssessment, setShowNewAssessment] = useState(false)
  const { user } = useUser()
  const clinicianName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Unknown Clinician'
  const { data: patient, isLoading, isError } = usePatient(patientId)

  const portal = createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Patient Details</h2>
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
          {isLoading && <ModalSkeleton />}

          {(isError || (!isLoading && !patient)) && (
            <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
              Patient not found or failed to load.
            </div>
          )}

          {patient && (
            <div className="space-y-6">
              {/* Patient info card */}
              <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-100">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-sm">
                      {patient.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{patient.full_name}</h3>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {patient.patient_number}
                        </span>
                        <RiskBadge level={(patient.latest_risk_level ?? null) as RiskLevel | null} />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Age {patient.age} · Submitted {formatDate(patient.date_of_submission)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewAssessment(true)}
                    className="btn-primary shrink-0 text-sm"
                  >
                    + New Assessment
                  </button>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-200 pt-5 sm:grid-cols-4">
                  <InfoItem label="Patient ID"     value={patient.patient_number} />
                  <InfoItem label="Age"            value={`${patient.age} years`} />
                  <InfoItem label="Date Submitted" value={formatDate(patient.date_of_submission)} />
                  <InfoItem label="Assessments"    value={String((patient.assessments ?? []).length)} />
                </dl>
              </div>

              {/* Assessment history */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Assessment History</h4>
                {(patient.assessments ?? []).length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-gray-100">
                    <p className="text-sm text-gray-400">No assessments yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowNewAssessment(true)}
                      className="btn-primary mt-4 inline-flex text-sm"
                    >
                      Run First Assessment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-50">
                          {['Date', 'Risk Level', 'Low %', 'Medium %', 'High %', 'BMI', ''].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(patient.assessments ?? []).map((a) => (
                          <AssessmentRow key={a.id} assessment={a} patient={patient} clinicianName={clinicianName} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 shrink-0">
          <button type="button" onClick={onClose} className="btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )

  return (
    <>
      {portal}
      {showNewAssessment && (
        <NewAssessmentModal
          patientId={patientId}
          onClose={() => setShowNewAssessment(false)}
        />
      )}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AssessmentRow({
  assessment: a,
  patient,
  clinicianName,
}: {
  assessment: Assessment
  patient: Patient
  clinicianName: string
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {formatDateTime(a.created_at)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <RiskBadge level={a.risk_level} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-green-600 font-medium tabular-nums">
        {a.low_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-yellow-600 font-medium tabular-nums">
        {a.medium_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-red-600 font-medium tabular-nums">
        {a.high_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {a.bmi.toFixed(1)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <button
          onClick={() => generateAssessmentPDF(a, patient, clinicianName)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          PDF
        </button>
      </td>
    </tr>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  )
}

function ModalSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-100 space-y-4">
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded bg-gray-200" />
            <div className="h-3 w-32 rounded bg-gray-200" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 rounded bg-gray-200" />)}
        </div>
      </div>
      <div className="h-40 rounded-2xl bg-gray-100" />
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
