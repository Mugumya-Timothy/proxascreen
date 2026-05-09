import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import RiskBadge from '../../components/RiskBadge'
import PatientDetailModal from '../../components/PatientDetailModal'
import AddPatientModal from '../../components/AddPatientModal'
import { usePatients, useBulkImportPatients, useDeletePatient, useBulkDeletePatients } from '../../hooks/usePatients'
import type { Patient, RiskLevel, BulkImportResult } from '../../types'

// ── Sample CSV content ────────────────────────────────────────────────────────

const SAMPLE_CSV = `full_name,age,date_of_submission,bmi,smoker,diet_type,physical_activity_level,alcohol_consumption,family_history_relatives,regular_health_checkup,prostate_exam_done,symptoms
John Smith,55,2026-03-27,27.5,false,mixed,moderate,no,,true,false,
James Brown,62,2026-03-27,31.2,true,fatty,low,moderate,father|brother,false,false,"{""haematuria"":""Present"",""bone_pain"":""Present""}"
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

// ── Types ─────────────────────────────────────────────────────────────────────

type RiskFilter = 'all' | RiskLevel

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [search, setSearch]               = useState('')
  const [riskFilter, setRiskFilter]       = useState<RiskFilter>('all')
  const [showBulkModal, setShowBulkModal]   = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string; number: string } | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  const { data: patients = [], isLoading, isError } = usePatients()

  const riskCounts = useMemo(() => ({
    all:    patients.length,
    Low:    patients.filter(p => p.latest_risk_level === 'Low').length,
    Medium: patients.filter(p => p.latest_risk_level === 'Medium').length,
    High:   patients.filter(p => p.latest_risk_level === 'High').length,
  }), [patients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return patients.filter(p => {
      const matchSearch = !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.patient_number.toLowerCase().includes(q)
      const matchRisk = riskFilter === 'all' || p.latest_risk_level === riskFilter
      return matchSearch && matchRisk
    })
  }, [patients, search, riskFilter])

  const isFiltered = search !== '' || riskFilter !== 'all'

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
          >
            <PatientsPageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-900">Patients</h1>
            <p className="text-sm text-gray-500">
              {isLoading
                ? <span className="inline-block h-3 w-20 animate-pulse rounded-md bg-gray-200" />
                : `${patients.length} registered patient${patients.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn-outline gap-1.5"
          >
            <UploadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Import</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowBulkDelete(true)}
            className="btn-outline gap-1.5 text-red-600 hover:border-red-300 hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Delete</span>
            <span className="sm:hidden">Delete</span>
          </button>
          <button onClick={() => setShowAddPatient(true)} className="btn-primary gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* ── Search + risk filter toolbar ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-72">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or patient ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'all' as const,    label: 'All',    count: riskCounts.all    },
            { key: 'Low' as const,    label: 'Low',    count: riskCounts.Low    },
            { key: 'Medium' as const, label: 'Medium', count: riskCounts.Medium },
            { key: 'High' as const,   label: 'High',   count: riskCounts.High   },
          ]).map(({ key, label, count }) => {
            const active = riskFilter === key
            const activeCls =
              key === 'all'    ? 'bg-primary text-white shadow-sm ring-primary' :
              key === 'Low'    ? 'bg-green-600 text-white shadow-sm ring-green-600' :
              key === 'Medium' ? 'bg-yellow-500 text-white shadow-sm ring-yellow-500' :
                                 'bg-red-600 text-white shadow-sm ring-red-600'
            return (
              <button
                key={key}
                onClick={() => setRiskFilter(key)}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ring-1',
                  active
                    ? activeCls
                    : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                {label}
                <span className={[
                  'rounded-full px-1.5 py-px text-[10px] font-bold leading-none tabular-nums',
                  active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500',
                ].join(' ')}>
                  {isLoading ? '–' : count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          <AlertIcon className="h-4 w-4 shrink-0 text-red-500" />
          Failed to load patients. Please refresh the page.
        </div>
      )}

      {/* ── Result count caption when filtering ───────────────────────────── */}
      {!isLoading && !isError && isFiltered && (
        <p className="text-sm text-gray-500">
          Showing{' '}
          <span className="font-semibold text-gray-800">{filtered.length}</span>
          {' '}of{' '}
          <span className="font-semibold text-gray-800">{patients.length}</span>
          {' '}patients
        </p>
      )}

      {/* ── Desktop table ─────────────────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 sm:block">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/80">
              {['Patient ID', 'Patient', 'Age', 'Submission Date', 'Risk Level', ''].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400"
                >
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
                <td colSpan={6}>
                  <EmptyState search={search} riskFilter={riskFilter} />
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <PatientRow
                  key={p.id}
                  patient={p}
                  onView={() => setSelectedId(p.id)}
                  onDelete={() => setDeleteTarget({ id: p.id, name: p.full_name, number: p.patient_number })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list ──────────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MobileSkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <EmptyState search={search} riskFilter={riskFilter} />
        ) : (
          filtered.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              onView={() => setSelectedId(p.id)}
              onDelete={() => setDeleteTarget({ id: p.id, name: p.full_name, number: p.patient_number })}
            />
          ))
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} />}

      {showAddPatient && (
        <AddPatientModal base="/admin" onClose={() => setShowAddPatient(false)} />
      )}

      {selectedId && (
        <PatientDetailModal base="/admin" patientId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          patient={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => setDeleteTarget(null)}
        />
      )}

      {showBulkDelete && (
        <BulkDeleteModal onClose={() => setShowBulkDelete(false)} />
      )}
    </div>
  )
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function PatientRow({ patient: p, onView, onDelete }: { patient: Patient; onView: () => void; onDelete: () => void }) {
  return (
    <tr
      className="group cursor-pointer transition-colors hover:bg-primary/[0.025]"
      onClick={onView}
    >
      {/* Patient ID */}
      <td className="whitespace-nowrap px-5 py-4">
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold tracking-wide text-primary">
          {p.patient_number}
        </span>
      </td>

      {/* Name + avatar */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
          >
            {getInitials(p.full_name)}
          </div>
          <span className="text-sm font-semibold text-gray-900">{p.full_name}</span>
        </div>
      </td>

      {/* Age */}
      <td className="whitespace-nowrap px-5 py-4">
        <span className="text-sm text-gray-700">{p.age}</span>
        <span className="ml-0.5 text-xs text-gray-400">yrs</span>
      </td>

      {/* Date */}
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
        {formatDate(p.date_of_submission)}
      </td>

      {/* Risk */}
      <td className="whitespace-nowrap px-5 py-4">
        <RiskBadge level={p.latest_risk_level as RiskLevel | null} />
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={e => { e.stopPropagation(); onView() }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-primary hover:text-white hover:ring-primary group-hover:ring-primary/30"
          >
            View
            <ChevronRightSmIcon className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="inline-flex items-center justify-center rounded-lg bg-white p-1.5 text-red-400 ring-1 ring-gray-200 transition-all hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
            title="Delete patient"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Mobile patient card ───────────────────────────────────────────────────────

function PatientCard({ patient: p, onView, onDelete }: { patient: Patient; onView: () => void; onDelete: () => void }) {
  return (
    <div className="w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 flex items-center gap-3 px-4 py-4 transition-all hover:shadow-md hover:ring-primary/20">
      {/* Avatar */}
      <div
        aria-hidden
        onClick={onView}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white shadow"
        style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
      >
        {getInitials(p.full_name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onView}>
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{p.full_name}</p>
          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {p.patient_number}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {p.age} yrs · {formatDate(p.date_of_submission)}
        </p>
      </div>

      {/* Risk + actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <RiskBadge level={p.latest_risk_level as RiskLevel | null} size="sm" />
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="flex items-center justify-center rounded-lg p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete patient"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ search, riskFilter }: { search: string; riskFilter: RiskFilter }) {
  const isFiltered = search !== '' || riskFilter !== 'all'
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-gray-100 sm:rounded-none sm:ring-0">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100">
        {isFiltered
          ? <SearchIcon className="h-6 w-6 text-gray-300" />
          : <PatientsPageIcon className="h-6 w-6 text-gray-300" />
        }
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">
          {isFiltered ? 'No matching patients' : 'No patients yet'}
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
          {isFiltered
            ? "Try adjusting your search or risk filter to find what you're looking for."
            : 'Add your first patient to get started with assessments.'
          }
        </p>
      </div>
      {!isFiltered && (
        <Link to="/admin/patients/new" className="btn-primary text-xs">
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Add First Patient
        </Link>
      )}
    </div>
  )
}

// ── Bulk import modal ─────────────────────────────────────────────────────────

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const fileRef         = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
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

  const successCount = results?.filter(r => !r.error).length ?? 0
  const errorCount   = results?.filter(r => !!r.error).length ?? 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-primary/50 hover:bg-primary/5',
            ].join(' ')}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0])}
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
              physical_activity_level · alcohol_consumption · family_history ·
              regular_health_checkup · prostate_exam_done
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
                      {results.filter(r => r.error).map(r => (
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
            <button onClick={onClose} className="btn-primary flex-1">Done</button>
          ) : (
            <>
              <button
                onClick={() => file && mutation.mutate(file, {
                  onSuccess: data => {
                    setResults(data)
                    const ok  = data.filter(r => !r.error).length
                    const bad = data.filter(r =>  r.error).length
                    if (bad === 0) {
                      toast.success(`${ok} patient${ok !== 1 ? 's' : ''} imported successfully`)
                    } else {
                      toast.warning(`${ok} imported, ${bad} row${bad !== 1 ? 's' : ''} had errors`, {
                        description: 'Review the results table below',
                      })
                    }
                  },
                  onError: err => {
                    toast.error('Import failed', {
                      description: err instanceof Error ? err.message : 'Please try again',
                    })
                  },
                })}
                disabled={!file || mutation.isPending}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? 'Importing…' : 'Import'}
              </button>
              <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Skeleton — desktop ────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[72, 200, 40, 104, 80, 56].map((w, i) => (
        <td key={i} className="px-5 py-4">
          {i === 1 ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="h-4 rounded-lg bg-gray-100 animate-pulse" style={{ width: 140 }} />
            </div>
          ) : (
            <div className="h-4 animate-pulse rounded-lg bg-gray-100" style={{ width: w }} />
          )}
        </td>
      ))}
    </tr>
  )
}

// ── Skeleton — mobile ─────────────────────────────────────────────────────────

function MobileSkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-gray-100">
      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-3 w-24 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
    </div>
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
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ChevronRightSmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function PatientsPageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

// ── Single-patient delete confirmation ────────────────────────────────────────

function DeleteConfirmModal({
  patient,
  onClose,
  onConfirm,
}: {
  patient: { id: string; name: string; number: string }
  onClose:  () => void
  onConfirm: () => void
}) {
  const { mutate, isPending } = useDeletePatient()

  function handleDelete() {
    mutate(patient.id, {
      onSuccess: () => {
        toast.success(`${patient.name} has been deleted`)
        onConfirm()
      },
      onError: (err) => {
        toast.error('Delete failed', {
          description: err instanceof Error ? err.message : 'Please try again',
        })
      },
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <TrashIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Delete Patient</h2>
            <p className="mt-1 text-sm text-gray-500">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-gray-800">{patient.name}</span>{' '}
              (<span className="font-mono text-xs text-primary">{patient.number}</span>)?
              This will also remove all their assessments and cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline" disabled={isPending}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete Patient'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Bulk delete modal ─────────────────────────────────────────────────────────

type BulkDeleteMode = 'numbers' | 'range' | 'uuids'

function BulkDeleteModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode]         = useState<BulkDeleteMode>('numbers')
  const [input, setInput]       = useState('')
  const [rangeFrom, setFrom]    = useState('')
  const [rangeTo, setTo]        = useState('')

  const { mutate, isPending } = useBulkDeletePatients()

  function buildRequest() {
    if (mode === 'numbers') {
      const nums = input.split(',').map(s => s.trim()).filter(Boolean)
      return { patient_numbers: nums }
    }
    if (mode === 'range') {
      return { range_from: rangeFrom.trim(), range_to: rangeTo.trim() }
    }
    const ids = input.split(',').map(s => s.trim()).filter(Boolean)
    return { ids }
  }

  function handleSubmit() {
    const req = buildRequest()
    mutate(req, {
      onSuccess: (data) => {
        toast.success(`${data.deleted} patient${data.deleted !== 1 ? 's' : ''} deleted`)
        onClose()
      },
      onError: (err) => {
        toast.error('Bulk delete failed', {
          description: err instanceof Error ? err.message : 'Please try again',
        })
      },
    })
  }

  const isValid =
    (mode === 'numbers' && input.trim().length > 0) ||
    (mode === 'range'   && rangeFrom.trim().length > 0 && rangeTo.trim().length > 0) ||
    (mode === 'uuids'   && input.trim().length > 0)

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Bulk Delete Patients</h2>
            <p className="mt-0.5 text-xs text-gray-500">Permanently removes patients and all their assessments</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Mode selector */}
          <div className="flex rounded-xl border border-gray-200 p-1 gap-1">
            {([
              { key: 'numbers' as const, label: 'Patient Numbers' },
              { key: 'range'   as const, label: 'Number Range'    },
              { key: 'uuids'   as const, label: 'UUIDs'           },
            ] as { key: BulkDeleteMode; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setMode(key); setInput(''); setFrom(''); setTo('') }}
                className={[
                  'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  mode === key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input area */}
          {mode === 'range' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600">From</label>
                <input
                  className="input mt-1"
                  placeholder="e.g. P001"
                  value={rangeFrom}
                  onChange={e => setFrom(e.target.value)}
                />
              </div>
              <span className="mt-5 text-gray-400">→</span>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600">To</label>
                <input
                  className="input mt-1"
                  placeholder="e.g. P050"
                  value={rangeTo}
                  onChange={e => setTo(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-600">
                {mode === 'numbers'
                  ? 'Patient numbers (comma-separated)'
                  : 'Patient UUIDs (comma-separated)'}
              </label>
              <textarea
                className="input mt-1 min-h-[80px] resize-y font-mono text-xs"
                placeholder={
                  mode === 'numbers'
                    ? 'e.g. P001, P002, P015'
                    : 'e.g. uuid1, uuid2, uuid3'
                }
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>
          )}

          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700 ring-1 ring-red-200">
            ⚠ This action is <strong>permanent</strong>. All assessments for the deleted patients will also be removed.
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            <TrashIcon className="h-4 w-4" />
            {isPending ? 'Deleting…' : 'Delete Patients'}
          </button>
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
