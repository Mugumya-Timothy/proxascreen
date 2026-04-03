import api from './api'
import type { ClinicianStats, AdminStats, ServicesHealth } from '../types'

export const getClinicianStats = (): Promise<ClinicianStats> =>
  api.get<ClinicianStats>('/api/v1/dashboard/clinician-stats').then((r) => r.data)

export const getAdminStats = (): Promise<AdminStats> =>
  api.get<AdminStats>('/api/v1/dashboard/stats').then((r) => r.data)

export const getServicesHealth = (): Promise<ServicesHealth> =>
  api.get<ServicesHealth>('/api/v1/dashboard/services-health').then((r) => r.data)
