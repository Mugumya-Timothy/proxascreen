import { useQuery } from '@tanstack/react-query'
import { getAdminStats, getClinicianStats, getServicesHealth } from '../services/dashboard'

// ── Query keys ────────────────────────────────────────────────────────────────

export const DASHBOARD_KEYS = {
  adminStats:      ['admin-stats']      as const,
  clinicianStats:  ['clinician-stats']  as const,
  servicesHealth:  ['services-health']  as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches platform-wide statistics for the admin dashboard.
 * Returns total_clinicians, total_patients, total_assessments, total_high_risk.
 */
export function useAdminStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.adminStats,
    queryFn:  getAdminStats,
  })
}

/**
 * Fetches per-clinician statistics for the clinician dashboard.
 * Returns total_patients, total_assessments, high_risk_count, low_risk_count.
 */
export function useClinicianStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.clinicianStats,
    queryFn:  getClinicianStats,
  })
}

/**
 * Polls the backend every 15 s for live API + model-service health status.
 * Admin-only endpoint.
 */
export function useServicesHealth() {
  return useQuery({
    queryKey:       DASHBOARD_KEYS.servicesHealth,
    queryFn:        getServicesHealth,
    refetchInterval: 15_000,
    retry:          false,
  })
}
