import api from './api'
import type { ClinicianStats, AdminStats } from '../types'

export const getClinicianStats = (): Promise<ClinicianStats> =>
  api.get<ClinicianStats>('/api/v1/dashboard/clinician-stats').then((r) => r.data)

export const getAdminStats = (): Promise<AdminStats> =>
  api.get<AdminStats>('/api/v1/dashboard/stats').then((r) => r.data)
