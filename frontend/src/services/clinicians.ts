import api from './api'
import type { User, CreateClinicianRequest } from '../types'

export const getClinicians = (): Promise<User[]> =>
  api.get<User[]>('/api/v1/clinicians').then((r) => r.data)

export const getClinician = (id: string): Promise<User> =>
  api.get<User>(`/api/v1/clinicians/${id}`).then((r) => r.data)

export const createClinician = (data: CreateClinicianRequest): Promise<User> =>
  api.post<User>('/api/v1/clinicians', data).then((r) => r.data)

export const deleteClinician = (id: string): Promise<void> =>
  api.delete(`/api/v1/clinicians/${id}`).then(() => undefined)
