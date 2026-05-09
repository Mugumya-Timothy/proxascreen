import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPatients,
  getPatient,
  createPatient,
  bulkImportPatients,
  deletePatient,
  bulkDeletePatients,
} from '../services/patients'
import type { BulkDeleteRequest } from '../services/patients'
import type { CreatePatientRequest } from '../types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const PATIENT_KEYS = {
  list:   ['patients']                                     as const,
  detail: (id: string | undefined) => ['patient', id]     as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all patients visible to the signed-in user.
 * Admins see all patients; clinicians see only their own.
 */
export function usePatients() {
  return useQuery({
    queryKey: PATIENT_KEYS.list,
    queryFn:  getPatients,
  })
}

/**
 * Fetches a single patient by UUID, including their assessment history.
 *
 * @param id  Patient UUID from route params. Query is disabled when falsy.
 */
export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: PATIENT_KEYS.detail(id),
    queryFn:  () => getPatient(id!),
    enabled:  !!id,
  })
}

/**
 * Creates a new patient together with their initial assessment in one request.
 * On success, invalidates the patient list so it re-fetches automatically.
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useCreatePatient()
 *   mutate(formData, { onSuccess: ({ patient, assessment }) => ... })
 */
export function useCreatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePatientRequest) => createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_KEYS.list })
    },
  })
}

/**
 * Bulk-imports patients from a CSV or XLSX file.
 * On success, invalidates the patient list and returns per-row import results.
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useBulkImportPatients()
 *   mutate(file, { onSuccess: (results) => setResults(results) })
 */
export function useBulkImportPatients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => bulkImportPatients(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_KEYS.list })
    },
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_KEYS.list })
    },
  })
}

export function useBulkDeletePatients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: BulkDeleteRequest) => bulkDeletePatients(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_KEYS.list })
    },
  })
}
