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
export type AlcoholConsumption    = 'no'    | 'moderate' | 'high'
export type RiskLevel             = 'Low'   | 'Medium'   | 'High'

export interface ContributingFactor {
  factor:        string
  direction:     'Increased risk' | 'Decreased risk'
  strength:      'Strong' | 'Moderate' | 'Mild'
  importance:    number
  clinical_note?: string
}

export interface LifestyleFactorNote {
  feature:       string
  label:         string
  direction:     'Increased risk' | 'Decreased risk'
  clinical_note: string
}

export interface Assessment {
  id:                      string
  patient_id:              string
  clinician_id:            string
  age:                     number
  bmi:                     number
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  alcohol_consumption:     AlcoholConsumption
  family_history:          boolean   // legacy — derived from score > 0
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
  risk_level:               RiskLevel
  low_percentage:           number
  medium_percentage:        number
  high_percentage:          number
  model_confidence:         number
  risk_explanation:         string
  active_risk_factors:      string[]
  inactive_risk_factors?:   string[]
  protective_factors:       string[]
  summary_text:             string
  top_contributing_factors: ContributingFactor[]
  lifestyle_factor_notes:   LifestyleFactorNote[]
  clinical_recommendation:  string
  feature_importances:      Record<string, number>
  // v2 fields
  family_history_score:       number
  family_history_relatives:   string   // JSON-encoded string[] from DB
  family_history_detail:      FamilyHistoryDetail | null
  symptom_score:              number
  symptoms_present:           string   // JSON-encoded string[] from DB
  symptom_adjustment_applied: boolean
  symptom_adjustment:         SymptomAdjustment | null
  base_risk_level:            RiskLevel
  final_risk_level:           RiskLevel
  age_advisory_shown:         boolean
  age_advisory:               string | null
  raw_symptom_dict:           Record<string, SymptomStatus> | null
  eligible?:                  boolean
  blocked_reason?:            string | null
  created_at:              string
  updated_at:              string
}

// ── v2 Assessment types ───────────────────────────────────────────────────────

export type SymptomStatus = 'Present' | 'Absent' | 'Not Documented'

export interface FamilyHistoryDetail {
  has_history:   boolean
  relatives:     string[]
  score:         number
  score_display: string
  significance:  string
}

export interface SymptomAdjustment {
  final_risk_level:     RiskLevel
  base_risk_level:      RiskLevel
  adjustment_applied:   boolean
  adjustment_reason:    string
  symptom_score:        number
  symptoms_present:     string[]
  urgent_symptom_flags: string[]
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
  alcohol_consumption:     AlcoholConsumption
  family_history_relatives: string[]
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
  symptom_dict?:           Record<string, SymptomStatus>
}

export interface CreateAssessmentRequest {
  age:                     number
  bmi:                     number
  smoker:                  boolean
  diet_type:               DietType
  physical_activity_level: PhysicalActivityLevel
  alcohol_consumption:     AlcoholConsumption
  family_history_relatives: string[]
  regular_health_checkup:  boolean
  prostate_exam_done:      boolean
  symptom_dict?:           Record<string, SymptomStatus>
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
