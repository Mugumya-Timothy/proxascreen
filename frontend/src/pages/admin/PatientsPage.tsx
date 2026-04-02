import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import RiskBadge from '../../components/RiskBadge'
import { usePatients, useBulkImportPatients } from '../../hooks/usePatients'
import type { Patient, RiskLevel, BulkImportResult } from '../../types'

// ── Sample CSV content ────────────────────────────────────────────────────────

const SAMPLE_CSV = `full_name,age,date_of_submission,bmi,smoker,diet_type,physical_activity_level,family_history,regular_health_checkup,prostate_exam_done
John Smith,55,2026-03-27,27.5,false,mixed,moderate,false,true,false
James Brown,62,2026-03-27,31.2,true,fatty,low,true,false,false
`

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'proxascreen_bulk_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [search, setSearch]           = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn-outline"
          >
            <UploadIcon className="mr-1.5 h-4 w-4" />
            Bulk Import
          </button>
          <Link to="/admin/patients/new" className="btn-primary">
            + Add Patient
          </Link>
        </div>
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

      {/* Bulk import modal */}
      {showBulkModal && (
        <BulkImportModal onClose={() => setShowBulkModal(false)} />
      )}
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
          to={`/admin/patients/${p.id}`}
          className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
        >
          View →
        </Link>
      </td>
    </tr>
  )
}

// ── Bulk import modal ─────────────────────────────────────────────────────────

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const fileRef       = useRef<HTMLInputElement>(null)
  const [file, setFile]     = useState<File | null>(null)
  const [results, setResults] = useState<BulkImportResult[] | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const mutation = useBulkImportPatients()

  function handleFileChange(picked: File | null | undefined) {
    if (!picked) return
    setFile(picked)
    setResults(null)
    mutation.reset()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFileChange(e.dataTransfer.files[0])
  }

  const successCount = results?.filter((r) => !r.error).length ?? 0
  const errorCount   = results?.filter((r) => !!r.error).length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Bulk Import Patients</h2>
            <p className="mt-0.5 text-xs text-gray-500">Upload a CSV or Excel file to create multiple patients at once</p>
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
        <div className="overflow-y-auto px-6 py-6 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Need a template?</p>
              <p className="text-xs text-gray-400 mt-0.5">Download the sample CSV to see the required format</p>
            </div>
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Template CSV
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            {file ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <UploadIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Drop your file here, or <span className="text-primary">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">CSV, XLSX or XLS · Max 10 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Required columns info */}
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 ring-1 ring-blue-100">
            <p className="font-semibold mb-1">Required columns (case-insensitive):</p>
            <p className="font-mono leading-relaxed">
              full_name · age · date_of_submission · bmi · smoker · diet_type ·
              physical_activity_level · family_history · regular_health_checkup · prostate_exam_done
            </p>
          </div>

          {/* Upload error */}
          {mutation.isError && (
            <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Import failed. Please check your file and try again.'}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {successCount} imported
                </span>
                {errorCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {errorCount} failed
                  </span>
                )}
              </div>

              {errorCount > 0 && (
                <div className="overflow-hidden rounded-xl border border-red-100">
                  <table className="min-w-full divide-y divide-red-50 text-xs">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="px-4 py-2.5 text-left font-semibold text-red-700">Row</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-red-700">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50 bg-white">
                      {results.filter((r) => r.error).map((r) => (
                        <tr key={r.row}>
                          <td className="px-4 py-2 font-mono text-gray-600">{r.row}</td>
                          <td className="px-4 py-2 text-red-600">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
          {results ? (
            <button onClick={onClose} className="btn-primary flex-1">
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => file && mutation.mutate(file, { onSuccess: (data) => setResults(data) })}
                disabled={!file || mutation.isPending}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? 'Importing…' : 'Import'}
              </button>
              <button onClick={onClose} className="btn-outline flex-1">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[64, 160, 32, 96, 80, 48].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: w }} />
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
