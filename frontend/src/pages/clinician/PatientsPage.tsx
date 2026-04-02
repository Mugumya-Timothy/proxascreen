import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import RiskBadge from '../../components/RiskBadge'
import { usePatients } from '../../hooks/usePatients'
import type { Patient, RiskLevel } from '../../types'

export default function PatientsPage() {
  const [search, setSearch] = useState('')

  const { data: patients = [], isLoading, isError } = usePatients()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.patient_number.toLowerCase().includes(q),
    )
  }, [patients, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading ? '—' : `${patients.length} total patient${patients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/patients/new" className="btn-primary">
          + Add Patient
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search by name or patient number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Failed to load patients. Please refresh.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['Patient #', 'Full Name', 'Age', 'Date of Submission', 'Latest Risk', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  {search ? 'No patients match your search.' : 'No patients yet. Add your first patient to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((p) => <PatientRow key={p.id} patient={p} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────

function PatientRow({ patient: p }: { patient: Patient }) {
  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="whitespace-nowrap px-5 py-4">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {p.patient_number}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm font-medium text-gray-900">{p.full_name}</span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{p.age}</td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
        {formatDate(p.date_of_submission)}
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <RiskBadge level={p.latest_risk_level as RiskLevel | null} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right">
        <Link
          to={`/patients/${p.id}`}
          className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
        >
          View →
        </Link>
      </td>
    </tr>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[64, 160, 32, 96, 80, 48].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 w-${w === 160 ? '40' : w} animate-pulse rounded bg-gray-100`}
            style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}
