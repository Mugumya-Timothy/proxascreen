import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClinicians,
  getClinician,
  createClinician,
  deleteClinician,
} from '../services/clinicians'
import type { CreateClinicianRequest } from '../types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const CLINICIAN_KEYS = {
  list:   ['clinicians']                                      as const,
  detail: (id: string | undefined) => ['clinician', id]      as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the full list of clinicians (admin only).
 */
export function useClinicians() {
  return useQuery({
    queryKey: CLINICIAN_KEYS.list,
    queryFn:  getClinicians,
  })
}

/**
 * Fetches a single clinician by UUID.
 *
 * @param id  Clinician UUID. Query is disabled when falsy.
 */
export function useClinician(id: string | undefined) {
  return useQuery({
    queryKey: CLINICIAN_KEYS.detail(id),
    queryFn:  () => getClinician(id!),
    enabled:  !!id,
  })
}

/**
 * Creates a new clinician account via the backend (which also provisions Clerk).
 * On success, invalidates the clinicians list so it re-fetches.
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useCreateClinician()
 *   mutate(formData, { onSuccess: () => setShowSuccess(true) })
 */
export function useCreateClinician() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClinicianRequest) => createClinician(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICIAN_KEYS.list })
    },
  })
}

/**
 * Deletes a clinician by UUID and revokes their Clerk account.
 * On success, invalidates the clinicians list.
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useDeleteClinician()
 *   mutate(clinicianId, { onSuccess: () => setConfirmId(null) })
 */
export function useDeleteClinician() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteClinician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICIAN_KEYS.list })
    },
  })
}
