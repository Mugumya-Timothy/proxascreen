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
	TopContributingFactors json.RawMessage `json:"top_contributing_factors"`
	ClinicalRecommendation string          `json:"clinical_recommendation"`
	FeatureImportances     json.RawMessage `json:"feature_importances"`
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
}

type CreateAssessmentParams struct {
	PatientID             string
	ClinicianClerkID      string
	Age                   float64
	BMI                   float64
	Smoker                bool
	DietType              string
	PhysicalActivityLevel string
	AlcoholConsumption    string
	FamilyHistory         bool
	RegularHealthCheckup  bool
	ProstateExamDone      bool
}

// modelPredictRequest matches the FastAPI /predict endpoint schema.
type modelPredictRequest struct {
	Age                   float64 `json:"age"`
	BMI                   float64 `json:"bmi"`
	Smoker                bool    `json:"smoker"`
	DietType              string  `json:"diet_type"`
	PhysicalActivityLevel string  `json:"physical_activity_level"`
	FamilyHistory         bool    `json:"family_history"`
	RegularHealthCheckup  bool    `json:"regular_health_checkup"`
	ProstateExamDone      bool    `json:"prostate_exam_done"`
	AlcoholConsumption    string  `json:"alcohol_consumption"`
}

type modelPredictResponse struct {
	RiskLevel              string          `json:"risk_level"`
	LowPercentage          float64         `json:"low_percentage"`
	MediumPercentage       float64         `json:"medium_percentage"`
	HighPercentage         float64         `json:"high_percentage"`
	ModelConfidence        float64         `json:"model_confidence"`
	RiskExplanation        string          `json:"risk_explanation"`
	TopContributingFactors json.RawMessage `json:"top_contributing_factors"`
	ClinicalRecommendation string          `json:"clinical_recommendation"`
	FeatureImportances     json.RawMessage `json:"feature_importances"`
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

	// Call model service.
	prediction, err := s.callModelService(ctx, modelPredictRequest{
		Age:                   p.Age,
		BMI:                   p.BMI,
		Smoker:                p.Smoker,
		DietType:              p.DietType,
		PhysicalActivityLevel: p.PhysicalActivityLevel,
		FamilyHistory:         p.FamilyHistory,
		RegularHealthCheckup:  p.RegularHealthCheckup,
		ProstateExamDone:      p.ProstateExamDone,
		AlcoholConsumption:    p.AlcoholConsumption,
	})
	if err != nil {
		return nil, fmt.Errorf("model prediction: %w", err)
	}

	// Persist assessment — JSONB columns receive explicit ::jsonb casts.
	var a Assessment
	err = s.db.QueryRow(ctx, `
		INSERT INTO assessments (
			patient_id, clinician_id, age, bmi, smoker, diet_type,
			physical_activity_level, alcohol_consumption, family_history,
			regular_health_checkup, prostate_exam_done,
			risk_level, low_percentage, medium_percentage, high_percentage,
			model_confidence, risk_explanation,
			top_contributing_factors, clinical_recommendation, feature_importances
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
			$12,$13,$14,$15,$16,$17,
			$18::jsonb,$19,$20::jsonb
		)
		RETURNING
			id, patient_id, clinician_id, age, bmi, smoker, diet_type,
			physical_activity_level, alcohol_consumption, family_history,
			regular_health_checkup, prostate_exam_done,
			risk_level, low_percentage, medium_percentage, high_percentage,
			model_confidence, risk_explanation,
			top_contributing_factors, clinical_recommendation, feature_importances,
			created_at, updated_at
	`,
		p.PatientID, clinicianID, p.Age, p.BMI, p.Smoker, p.DietType,
		p.PhysicalActivityLevel, p.AlcoholConsumption, p.FamilyHistory,
		p.RegularHealthCheckup, p.ProstateExamDone,
		prediction.RiskLevel, prediction.LowPercentage, prediction.MediumPercentage, prediction.HighPercentage,
		prediction.ModelConfidence, prediction.RiskExplanation,
		string(prediction.TopContributingFactors), prediction.ClinicalRecommendation, string(prediction.FeatureImportances),
	).Scan(
		&a.ID, &a.PatientID, &a.ClinicianID, &a.Age, &a.BMI, &a.Smoker, &a.DietType,
		&a.PhysicalActivityLevel, &a.AlcoholConsumption, &a.FamilyHistory,
		&a.RegularHealthCheckup, &a.ProstateExamDone,
		&a.RiskLevel, &a.LowPercentage, &a.MediumPercentage, &a.HighPercentage,
		&a.ModelConfidence, &a.RiskExplanation,
		&a.TopContributingFactors, &a.ClinicalRecommendation, &a.FeatureImportances,
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
			top_contributing_factors, clinical_recommendation, feature_importances,
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
			&a.TopContributingFactors, &a.ClinicalRecommendation, &a.FeatureImportances,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan assessment: %w", err)
		}
		list = append(list, a)
	}
	return list, rows.Err()
}
