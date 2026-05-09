import api from './api'
import type { Patient, CreatePatientRequest, PatientWithAssessment, BulkImportResult, BulkImportResponse } from '../types'

export const getPatients = (): Promise<Patient[]> =>
  api.get<Patient[]>('/api/v1/patients').then((r) => r.data)

export const getPatient = (id: string): Promise<Patient> =>
  api.get<Patient>(`/api/v1/patients/${id}`).then((r) => r.data)

export const createPatient = (data: CreatePatientRequest): Promise<PatientWithAssessment> =>
  api.post<PatientWithAssessment>('/api/v1/patients', data).then((r) => r.data)

export const bulkImportPatients = (file: File): Promise<BulkImportResult[]> => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post<BulkImportResponse>('/api/v1/patients/bulk-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.results)
}

export const deletePatient = (id: string): Promise<void> =>
  api.delete(`/api/v1/patients/${id}`).then(() => undefined)

export interface BulkDeleteRequest {
  ids?:             string[]
  patient_numbers?: string[]
  range_from?:      string
  range_to?:        string
}

export interface BulkDeleteResponse {
  deleted: number
}

export const bulkDeletePatients = (req: BulkDeleteRequest): Promise<BulkDeleteResponse> =>
  api.delete<BulkDeleteResponse>('/api/v1/patients/bulk', { data: req }).then((r) => r.data)
