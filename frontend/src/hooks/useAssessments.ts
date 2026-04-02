import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAssessment,
  createAssessment,
  getPatientAssessments,
} from '../services/assessments'
import type { CreateAssessmentRequest } from '../types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const ASSESSMENT_KEYS = {
  detail:         (id: string | undefined)        => ['assessment', id]                        as const,
  forPatient:     (patientId: string | undefined) => ['patient-assessments', patientId]        as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a single assessment by UUID.
 *
 * @param id  Assessment UUID from route params. Query is disabled when falsy.
 */
export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.detail(id),
    queryFn:  () => getAssessment(id!),
    enabled:  !!id,
  })
}

/**
 * Fetches all assessments for a given patient, ordered by date descending.
 *
 * @param patientId  Patient UUID. Query is disabled when falsy.
 */
export function usePatientAssessments(patientId: string | undefined) {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.forPatient(patientId),
    queryFn:  () => getPatientAssessments(patientId!),
    enabled:  !!patientId,
  })
}

/**
 * Creates a new assessment for an existing patient.
 * On success, invalidates the patient detail (which includes assessments),
 * the patient-assessments list, and the patients list (for latest_risk_level).
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useCreateAssessment()
 *   mutate({ patientId, data }, { onSuccess: (assessment) => setResult(assessment) })
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      patientId,
      data,
    }: {
      patientId: string
      data: CreateAssessmentRequest
    }) => createAssessment(patientId, data),

    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.forPatient(patientId) })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
