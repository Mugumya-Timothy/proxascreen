// ── Users / Auth ──────────────────────────────────────────────────────────────

export type Role = 'admin' | 'clinician'

export interface User {
  id:               string
  clerk_id:         string
  full_name:        string
  email:            string
  phone:            string | null
  role:             Role
  is_password_reset: boolean
}

// ── Patients ──────────────────────────────────────────────────────────────────

export interface Patient {
  id:                 string
  patient_number:     string
  full_name:          string
  age:                number
  date_of_submission: string   // YYYY-MM-DD
  created_by:         string   // users.id
  created_at:         string
  updated_at:         string
  latest_risk_level?: RiskLevel | null
  assessments?:       Assessment[]
}

// ── Assessments ───────────────────────────────────────────────────────────────

export type DietType              = 'fatty' | 'mixed' | 'healthy'
export type PhysicalActivityLevel = 'low'   | 'moderate' | 'high'
export type RiskLevel             = 'Low'   | 'Medium'   | 'High'

export interface Assessment {
  id:                      string
  patient_id:              string
  clinician_id:            string
  age:                     number
  bmi:                     number
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  family_history:          boolean
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
  risk_level:              RiskLevel
  low_percentage:          number
  medium_percentage:       number
  high_percentage:         number
  created_at:              string
  updated_at:              string
}

// ── API request/response shapes ───────────────────────────────────────────────

export interface CreatePatientRequest {
  full_name:               string
  age:                     number
  date_of_submission?:     string
  bmi:                     number
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  family_history:          boolean
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
}

export interface CreateAssessmentRequest {
  age:                     number
  bmi:                     number
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  family_history:          boolean
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
}

export interface PatientWithAssessment {
  patient:    Patient
  assessment: Assessment
}

export interface CreateClinicianRequest {
  first_name:    string
  last_name:     string
  email:         string
  phone?:        string
  temp_password: string
}

export interface ResetPasswordRequest {
  new_password: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface ServiceStatus {
  status:     'online' | 'offline'
  latency_ms: number
}

export interface ServicesHealth {
  api:           ServiceStatus
  model_service: ServiceStatus
}

export interface AdminStats {
  total_clinicians:  number
  total_patients:    number
  total_assessments: number
  total_high_risk:   number
}

export interface ClinicianStats {
  total_patients:    number
  total_assessments: number
  high_risk_count:   number
  low_risk_count:    number
}

// ── Bulk import ───────────────────────────────────────────────────────────────

export interface BulkImportResult {
  row:            number
  patient_number?: string
  risk_level?:    RiskLevel
  error?:         string
}

export interface BulkImportResponse {
  results: BulkImportResult[]
}
