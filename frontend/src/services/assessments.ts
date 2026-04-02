import api from './api'
import type { Assessment, CreateAssessmentRequest } from '../types'

export const getPatientAssessments = (patientId: string): Promise<Assessment[]> =>
  api.get<Assessment[]>(`/api/v1/patients/${patientId}/assessments`).then((r) => r.data)

export const createAssessment = (
  patientId: string,
  data: CreateAssessmentRequest,
): Promise<Assessment> =>
  api
    .post<Assessment>(`/api/v1/patients/${patientId}/assessments`, data)
    .then((r) => r.data)

export const getAssessment = (id: string): Promise<Assessment> =>
  api.get<Assessment>(`/api/v1/assessments/${id}`).then((r) => r.data)
