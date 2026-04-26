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

  const initials = patient
    ? patient.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const portal = createPortal(
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
              <UserIcon className="h-5 w-5 text-white/80" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Patient Details</h2>
              <p className="mt-0.5 text-xs text-white/55">Medical record and assessment history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && <ModalSkeleton />}

          {(isError || (!isLoading && !patient)) && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">Patient not found or failed to load.</p>
            </div>
          )}

          {patient && (
            <div className="space-y-5">

              {/* ── Patient info card ── */}
              <div className="overflow-hidden rounded-xl border border-gray-100">
                {/* Card header strip */}
                <div
                  className="px-5 py-4"
                  style={{ background: 'linear-gradient(135deg, #f0f9fe 0%, #f8fcff 100%)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Gradient avatar */}
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900">{patient.full_name}</h3>
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
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                  <InfoCell label="Patient ID"     value={patient.patient_number} />
                  <InfoCell label="Age"            value={`${patient.age} years`} />
                  <InfoCell label="Date Submitted" value={formatDate(patient.date_of_submission)} />
                  <InfoCell label="Assessments"    value={String((patient.assessments ?? []).length)} />
                </div>
              </div>

              {/* ── Assessment history ── */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">Assessment History</h4>
                  {(patient.assessments ?? []).length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {(patient.assessments ?? []).length} record{(patient.assessments ?? []).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {(patient.assessments ?? []).length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                      <ClipboardIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-600">No assessments yet</p>
                    <p className="mt-1 text-xs text-gray-400">Run the first assessment to see results here.</p>
                    <button
                      type="button"
                      onClick={() => setShowNewAssessment(true)}
                      className="btn-primary mt-4 inline-flex text-sm"
                    >
                      Run First Assessment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Date', 'Risk Level', 'Low %', 'Medium %', 'High %', 'BMI', ''].map((h) => (
                              <th
                                key={h}
                                className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {(patient.assessments ?? []).map((a) => (
                            <AssessmentRow
                              key={a.id}
                              assessment={a}
                              patient={patient}
                              clinicianName={clinicianName}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 justify-end border-t border-gray-100 px-6 py-4">
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
    <tr className="transition-colors hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {formatDateTime(a.created_at)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <RiskBadge level={a.risk_level} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-green-600">
        {a.low_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-yellow-600">
        {a.medium_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-red-600">
        {a.high_percentage.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {a.bmi.toFixed(1)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <button
          onClick={() => generateAssessmentPDF(a, patient, clinicianName)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          PDF
        </button>
      </td>
    </tr>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  )
}

function ModalSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <div className="bg-primary/5 p-5">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px bg-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-40 rounded-xl bg-gray-100" />
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
