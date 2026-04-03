import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useClinicians, useDeleteClinician } from '../../hooks/useClinicians'
import AddClinicianModal from '../../components/AddClinicianModal'
import type { User } from '../../types'

export default function CliniciansPage() {
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: clinicians = [], isLoading, isError } = useClinicians()

  const deleteMutation = useDeleteClinician()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinicians</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading ? '—' : `${clinicians.length} total clinician${clinicians.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Add Clinician
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          Failed to load clinicians. Please refresh.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['Full Name', 'Email', 'Phone', 'Role', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : clinicians.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                  No clinicians yet. Add your first clinician to get started.
                </td>
              </tr>
            ) : (
              clinicians.map((c) => (
                <ClinicianRow
                  key={c.id}
                  clinician={c}
                  onDelete={() => setConfirmId(c.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {confirmId && (
        <ConfirmDeleteModal
          loading={deleteMutation.isPending}
          error={deleteMutation.isError
            ? (deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Delete failed')
            : null}
          onConfirm={() => deleteMutation.mutate(confirmId, {
            onSuccess: () => {
              setConfirmId(null)
              toast.success('Clinician removed', {
                description: 'The account has been permanently deleted',
              })
            },
            onError: (err) => {
              toast.error('Failed to remove clinician', {
                description: err instanceof Error ? err.message : 'Please try again',
              })
            },
          })}
          onCancel={() => { setConfirmId(null); deleteMutation.reset() }}
        />
      )}

      {showAddModal && (
        <AddClinicianModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────

function ClinicianRow({ clinician: c, onDelete }: { clinician: User; onDelete: () => void }) {
  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {c.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900">{c.full_name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{c.email}</td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{c.phone ?? '—'}</td>
      <td className="whitespace-nowrap px-5 py-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
          c.role === 'admin'
            ? 'bg-purple-50 text-purple-700 ring-purple-200'
            : 'bg-primary/10 text-primary ring-primary/20'
        }`}>
          {c.role === 'admin' ? 'Admin' : 'Clinician'}
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right">
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      </td>
    </tr>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[180, 200, 100, 60, 64].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ── Confirm delete modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  loading: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-100">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <TrashIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete clinician?</h3>
            <p className="mt-1 text-sm text-gray-500">
              This action cannot be undone. The clinician will lose access immediately.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 btn-outline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}
