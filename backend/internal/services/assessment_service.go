package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ── Family history weights ────────────────────────────────────────────────────

var familyHistoryWeights = map[string]float64{
	"father":               0.40,
	"brother":              0.35,
	"paternal_grandfather": 0.15,
	"maternal_grandfather": 0.10,
}

// ComputeFamilyHistoryScore converts a list of relative keys into a weighted
// float score capped at 1.0.
func ComputeFamilyHistoryScore(relatives []string) float64 {
	var score float64
	for _, r := range relatives {
		if w, ok := familyHistoryWeights[strings.ToLower(strings.TrimSpace(r))]; ok {
			score += w
		}
	}
	if score > 1.0 {
		score = 1.0
	}
	return score
}

// ── Service ───────────────────────────────────────────────────────────────────

type AssessmentService struct {
	db              *pgxpool.Pool
	modelServiceURL string
	httpClient      *http.Client
}

func NewAssessmentService(db *pgxpool.Pool, modelServiceURL string) *AssessmentService {
	return &AssessmentService{
		db:              db,
		modelServiceURL: modelServiceURL,
		httpClient:      &http.Client{Timeout: 30 * time.Second},
	}
}

// Assessment is the full assessment record returned to API consumers.
type Assessment struct {
	ID                     string          `json:"id"`
	PatientID              string          `json:"patient_id"`
	ClinicianID            string          `json:"clinician_id"`
	Age                    float64         `json:"age"`
	BMI                    float64         `json:"bmi"`
	Smoker                 bool            `json:"smoker"`
	DietType               string          `json:"diet_type"`
	PhysicalActivityLevel  string          `json:"physical_activity_level"`
	AlcoholConsumption     string          `json:"alcohol_consumption"`
	FamilyHistory          bool            `json:"family_history"`
	RegularHealthCheckup   bool            `json:"regular_health_checkup"`
	ProstateExamDone       bool            `json:"prostate_exam_done"`
	RiskLevel              string          `json:"risk_level"`
	LowPercentage          float64         `json:"low_percentage"`
	MediumPercentage       float64         `json:"medium_percentage"`
	HighPercentage         float64         `json:"high_percentage"`
	ModelConfidence        float64         `json:"model_confidence"`
	RiskExplanation        string          `json:"risk_explanation"`
	ActiveRiskFactors      json.RawMessage `json:"active_risk_factors"`
	ProtectiveFactors      json.RawMessage `json:"protective_factors"`
	SummaryText            string          `json:"summary_text"`
	TopContributingFactors json.RawMessage `json:"top_contributing_factors"`
	LifestyleFactorNotes   json.RawMessage `json:"lifestyle_factor_notes"`
	ClinicalRecommendation string          `json:"clinical_recommendation"`
	FeatureImportances     json.RawMessage `json:"feature_importances"`
	// v2 fields
	FamilyHistoryScore       float64         `json:"family_history_score"`
	FamilyHistoryRelatives   string          `json:"family_history_relatives"`
	FamilyHistoryDetail      json.RawMessage `json:"family_history_detail"`
	SymptomScore             float64         `json:"symptom_score"`
	SymptomsPresent          string          `json:"symptoms_present"`
	SymptomAdjustmentApplied bool            `json:"symptom_adjustment_applied"`
	SymptomAdjustment        json.RawMessage `json:"symptom_adjustment"`
	BaseRiskLevel            string          `json:"base_risk_level"`
	FinalRiskLevel           string          `json:"final_risk_level"`
	AgeAdvisoryShown         bool            `json:"age_advisory_shown"`
	AgeAdvisory              string          `json:"age_advisory"`
	RawSymptomDict           json.RawMessage `json:"raw_symptom_dict"`
	CreatedAt                time.Time       `json:"created_at"`
	UpdatedAt                time.Time       `json:"updated_at"`
}

type CreateAssessmentParams struct {
	PatientID                string
	ClinicianClerkID         string
	Age                      float64
	BMI                      float64
	Smoker                   bool
	DietType                 string
	PhysicalActivityLevel    string
	AlcoholConsumption       string
	FamilyHistoryRelatives   []string
	RegularHealthCheckup     bool
	ProstateExamDone         bool
	SymptomDict              map[string]string
}

// modelPredictRequest matches the FastAPI /predict endpoint schema (v3).
type modelPredictRequest struct {
	Age                    float64           `json:"age"`
	BMI                    float64           `json:"bmi"`
	Smoker                 bool              `json:"smoker"`
	DietType               string            `json:"diet_type"`
	PhysicalActivityLevel  string            `json:"physical_activity_level"`
	FamilyHistoryScore     float64           `json:"family_history_score"`
	FamilyHistoryRelatives []string          `json:"family_history_relatives"`
	RegularHealthCheckup   bool              `json:"regular_health_checkup"`
	ProstateExamDone       bool              `json:"prostate_exam_done"`
	AlcoholConsumption     string            `json:"alcohol_consumption"`
	SymptomDict            map[string]string `json:"symptom_dict,omitempty"`
}

type modelPredictResponse struct {
	Eligible             bool            `json:"eligible"`
	BlockedReason        string          `json:"blocked_reason"`
	AgeAdvisory          string          `json:"age_advisory"`
	AgeAdvisoryShown     bool            `json:"age_advisory_shown"`
	RiskLevel            string          `json:"risk_level"`
	BaseRiskLevel        string          `json:"base_risk_level"`
	FinalRiskLevel       string          `json:"final_risk_level"`
	LowPercentage        float64         `json:"low_percentage"`
	MediumPercentage     float64         `json:"medium_percentage"`
	HighPercentage       float64         `json:"high_percentage"`
	ModelConfidence      float64         `json:"model_confidence"`
	RiskExplanation      string          `json:"risk_explanation"`
	ActiveRiskFactors    json.RawMessage `json:"active_risk_factors"`
	ProtectiveFactors    json.RawMessage `json:"protective_factors"`
	SummaryText          string          `json:"summary_text"`
	TopContributingFactors json.RawMessage `json:"top_contributing_factors"`
	LifestyleFactorNotes json.RawMessage `json:"lifestyle_factor_notes"`
	ClinicalRecommendation string        `json:"clinical_recommendation"`
	FeatureImportances   json.RawMessage `json:"feature_importances"`
	FamilyHistoryDetail  json.RawMessage `json:"family_history_detail"`
	SymptomAdjustment    json.RawMessage `json:"symptom_adjustment"`
	RawSymptomDict       json.RawMessage `json:"raw_symptom_dict"`
}

func (s *AssessmentService) CreateAssessment(ctx context.Context, p CreateAssessmentParams) (*Assessment, error) {
	normalized, err := normalizeCreateAssessmentParams(p)
	if err != nil {
		return nil, err
	}
	p = normalized

	// Resolve clinician clerk_id → users.id
	var clinicianID string
	err = s.db.QueryRow(ctx,
		`SELECT id FROM users WHERE clerk_id=$1`, p.ClinicianClerkID,
	).Scan(&clinicianID)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("clinician not found for clerk_id %q", p.ClinicianClerkID)
	}
	if err != nil {
		return nil, fmt.Errorf("resolve clinician: %w", err)
	}

	// Compute family history score from relatives list.
	fhScore     := ComputeFamilyHistoryScore(p.FamilyHistoryRelatives)
	fhRelatives := p.FamilyHistoryRelatives
	if fhRelatives == nil {
		fhRelatives = []string{}
	}
	fhRelativesJSON, err := json.Marshal(fhRelatives)
	if err != nil {
		return nil, fmt.Errorf("marshal family_history_relatives: %w", err)
	}

	// Derive legacy boolean (any relatives ticked).
	familyHistoryBool := fhScore > 0.0

	// Call model service.
	prediction, err := s.callModelService(ctx, modelPredictRequest{
		Age:                   p.Age,
		BMI:                   p.BMI,
		Smoker:                p.Smoker,
		DietType:              p.DietType,
		PhysicalActivityLevel: p.PhysicalActivityLevel,
		FamilyHistoryScore:    fhScore,
		FamilyHistoryRelatives: fhRelatives,
		RegularHealthCheckup:  p.RegularHealthCheckup,
		ProstateExamDone:      p.ProstateExamDone,
		AlcoholConsumption:    p.AlcoholConsumption,
		SymptomDict:           p.SymptomDict,
	})
	if err != nil {
		return nil, fmt.Errorf("model prediction: %w", err)
	}

	// Age gate — model returned ineligible.
	if !prediction.Eligible {
		return nil, fmt.Errorf("assessment blocked: %s", prediction.BlockedReason)
	}

	// Extract symptom adjustment fields for flat columns.
	var symAdj struct {
		FinalRiskLevel   string   `json:"final_risk_level"`
		BaseRiskLevel    string   `json:"base_risk_level"`
		AdjApplied       bool     `json:"adjustment_applied"`
		SymptomScore     float64  `json:"symptom_score"`
		SymptomsPresent  []string `json:"symptoms_present"`
	}
	if len(prediction.SymptomAdjustment) > 0 {
		_ = json.Unmarshal(prediction.SymptomAdjustment, &symAdj)
	}

	symptomsPresentJSON, err := json.Marshal(symAdj.SymptomsPresent)
	if err != nil {
		symptomsPresentJSON = json.RawMessage("[]")
	}

	ageAdvisory := prediction.AgeAdvisory
	if ageAdvisory == "" {
		ageAdvisory = ""
	}

	// Ensure JSONB fields have a non-null value.
	if len(prediction.FamilyHistoryDetail) == 0 {
		prediction.FamilyHistoryDetail = json.RawMessage("{}")
	}
	if len(prediction.SymptomAdjustment) == 0 {
		prediction.SymptomAdjustment = json.RawMessage("{}")
	}
	if len(prediction.RawSymptomDict) == 0 {
		prediction.RawSymptomDict = json.RawMessage("{}")
	}
	if len(prediction.ActiveRiskFactors) == 0 {
		prediction.ActiveRiskFactors = json.RawMessage("[]")
	}
	if len(prediction.ProtectiveFactors) == 0 {
		prediction.ProtectiveFactors = json.RawMessage("[]")
	}
	if len(prediction.TopContributingFactors) == 0 {
		prediction.TopContributingFactors = json.RawMessage("[]")
	}
	if len(prediction.LifestyleFactorNotes) == 0 {
		prediction.LifestyleFactorNotes = json.RawMessage("[]")
	}
	if len(prediction.FeatureImportances) == 0 {
		prediction.FeatureImportances = json.RawMessage("{}")
	}

	// Persist assessment.
	var a Assessment
	err = s.db.QueryRow(ctx, `
		INSERT INTO assessments (
			patient_id, clinician_id, age, bmi, smoker, diet_type,
			physical_activity_level, alcohol_consumption, family_history,
			regular_health_checkup, prostate_exam_done,
			risk_level, low_percentage, medium_percentage, high_percentage,
			model_confidence, risk_explanation,
			active_risk_factors, protective_factors, summary_text,
			top_contributing_factors, lifestyle_factor_notes,
			clinical_recommendation, feature_importances,
			family_history_score, family_history_relatives, family_history_detail,
			symptom_score, symptoms_present, symptom_adjustment_applied,
			symptom_adjustment, base_risk_level, final_risk_level,
			age_advisory_shown, age_advisory, raw_symptom_dict
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
			$12,$13,$14,$15,$16,$17,
			$18::jsonb,$19::jsonb,$20,
			$21::jsonb,$22::jsonb,
			$23,$24::jsonb,
			$25,$26,$27::jsonb,
			$28,$29,$30,
			$31::jsonb,$32,$33,
			$34,$35,$36::jsonb
		)
		RETURNING
			id, patient_id, clinician_id, age, bmi, smoker, diet_type,
			physical_activity_level, alcohol_consumption, family_history,
			regular_health_checkup, prostate_exam_done,
			risk_level, low_percentage, medium_percentage, high_percentage,
			model_confidence, risk_explanation,
			active_risk_factors, protective_factors, summary_text,
			top_contributing_factors, lifestyle_factor_notes,
			clinical_recommendation, feature_importances,
			family_history_score, family_history_relatives, family_history_detail,
			symptom_score, symptoms_present, symptom_adjustment_applied,
			symptom_adjustment, base_risk_level, final_risk_level,
			age_advisory_shown, age_advisory, raw_symptom_dict,
			created_at, updated_at
	`,
		p.PatientID, clinicianID, p.Age, p.BMI, p.Smoker, p.DietType,
		p.PhysicalActivityLevel, p.AlcoholConsumption, familyHistoryBool,
		p.RegularHealthCheckup, p.ProstateExamDone,
		prediction.RiskLevel, prediction.LowPercentage, prediction.MediumPercentage, prediction.HighPercentage,
		prediction.ModelConfidence, prediction.RiskExplanation,
		string(prediction.ActiveRiskFactors), string(prediction.ProtectiveFactors), prediction.SummaryText,
		string(prediction.TopContributingFactors), string(prediction.LifestyleFactorNotes),
		prediction.ClinicalRecommendation, string(prediction.FeatureImportances),
		fhScore, string(fhRelativesJSON), string(prediction.FamilyHistoryDetail),
		symAdj.SymptomScore, string(symptomsPresentJSON), symAdj.AdjApplied,
		string(prediction.SymptomAdjustment), prediction.BaseRiskLevel, prediction.FinalRiskLevel,
		prediction.AgeAdvisoryShown, ageAdvisory, string(prediction.RawSymptomDict),
	).Scan(
		&a.ID, &a.PatientID, &a.ClinicianID, &a.Age, &a.BMI, &a.Smoker, &a.DietType,
		&a.PhysicalActivityLevel, &a.AlcoholConsumption, &a.FamilyHistory,
		&a.RegularHealthCheckup, &a.ProstateExamDone,
		&a.RiskLevel, &a.LowPercentage, &a.MediumPercentage, &a.HighPercentage,
		&a.ModelConfidence, &a.RiskExplanation,
		&a.ActiveRiskFactors, &a.ProtectiveFactors, &a.SummaryText,
		&a.TopContributingFactors, &a.LifestyleFactorNotes,
		&a.ClinicalRecommendation, &a.FeatureImportances,
		&a.FamilyHistoryScore, &a.FamilyHistoryRelatives, &a.FamilyHistoryDetail,
		&a.SymptomScore, &a.SymptomsPresent, &a.SymptomAdjustmentApplied,
		&a.SymptomAdjustment, &a.BaseRiskLevel, &a.FinalRiskLevel,
		&a.AgeAdvisoryShown, &a.AgeAdvisory, &a.RawSymptomDict,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert assessment: %w", err)
	}

	return &a, nil
}

func normalizeCreateAssessmentParams(p CreateAssessmentParams) (CreateAssessmentParams, error) {
	var err error

	p.DietType, err = normalizeRequiredEnum("diet_type", p.DietType, []string{"fatty", "mixed", "healthy"})
	if err != nil {
		return p, err
	}

	p.PhysicalActivityLevel, err = normalizeRequiredEnum("physical_activity_level", p.PhysicalActivityLevel, []string{"low", "moderate", "high"})
	if err != nil {
		return p, err
	}

	p.AlcoholConsumption, err = normalizeEnumWithDefault("alcohol_consumption", p.AlcoholConsumption, "no", []string{"no", "moderate", "high"})
	if err != nil {
		return p, err
	}

	return p, nil
}

func normalizeRequiredEnum(field, value string, allowed []string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return "", fmt.Errorf("%s is required", field)
	}
	for _, candidate := range allowed {
		if normalized == candidate {
			return normalized, nil
		}
	}
	return "", fmt.Errorf("%s must be one of %v", field, allowed)
}

func normalizeEnumWithDefault(field, value, fallback string, allowed []string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		normalized = fallback
	}
	for _, candidate := range allowed {
		if normalized == candidate {
			return normalized, nil
		}
	}
	return "", fmt.Errorf("%s must be one of %v", field, allowed)
}

func (s *AssessmentService) GetAssessment(ctx context.Context, id string) (*Assessment, error) {
	rows, err := s.db.Query(ctx, `
		SELECT
			id, patient_id, clinician_id, age, bmi, smoker, diet_type,
			physical_activity_level, alcohol_consumption, family_history,
			regular_health_checkup, prostate_exam_done,
			risk_level, low_percentage, medium_percentage, high_percentage,
			model_confidence, risk_explanation,
			active_risk_factors, protective_factors, summary_text,
			top_contributing_factors, lifestyle_factor_notes,
			clinical_recommendation, feature_importances,
			family_history_score, family_history_relatives, family_history_detail,
			symptom_score, symptoms_present, symptom_adjustment_applied,
			symptom_adjustment, base_risk_level, final_risk_level,
			age_advisory_shown, age_advisory, raw_symptom_dict,
			created_at, updated_at
		FROM assessments WHERE id=$1
	`, id)
	if err != nil {
		return nil, fmt.Errorf("query assessment: %w", err)
	}
	defer rows.Close()

	assessments, err := scanAssessments(rows)
	if err != nil {
		return nil, err
	}
	if len(assessments) == 0 {
		return nil, ErrNotFound
	}
	return &assessments[0], nil
}

func (s *AssessmentService) callModelService(ctx context.Context, req modelPredictRequest) (*modelPredictResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.modelServiceURL+"/predict", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call model service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("model service returned %d: %s", resp.StatusCode, raw)
	}

	var prediction modelPredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&prediction); err != nil {
		return nil, fmt.Errorf("decode model response: %w", err)
	}
	return &prediction, nil
}

// scanAssessments is shared with patient_service.go for eager-loading.
// The SELECT column list must match exactly.
func scanAssessments(rows pgx.Rows) ([]Assessment, error) {
	var list []Assessment
	for rows.Next() {
		var a Assessment
		if err := rows.Scan(
			&a.ID, &a.PatientID, &a.ClinicianID, &a.Age, &a.BMI, &a.Smoker, &a.DietType,
			&a.PhysicalActivityLevel, &a.AlcoholConsumption, &a.FamilyHistory,
			&a.RegularHealthCheckup, &a.ProstateExamDone,
			&a.RiskLevel, &a.LowPercentage, &a.MediumPercentage, &a.HighPercentage,
			&a.ModelConfidence, &a.RiskExplanation,
			&a.ActiveRiskFactors, &a.ProtectiveFactors, &a.SummaryText,
			&a.TopContributingFactors, &a.LifestyleFactorNotes,
			&a.ClinicalRecommendation, &a.FeatureImportances,
			&a.FamilyHistoryScore, &a.FamilyHistoryRelatives, &a.FamilyHistoryDetail,
			&a.SymptomScore, &a.SymptomsPresent, &a.SymptomAdjustmentApplied,
			&a.SymptomAdjustment, &a.BaseRiskLevel, &a.FinalRiskLevel,
			&a.AgeAdvisoryShown, &a.AgeAdvisory, &a.RawSymptomDict,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan assessment: %w", err)
		}
		list = append(list, a)
	}
	return list, rows.Err()
}
