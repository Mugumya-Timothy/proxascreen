package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PatientService struct {
	db *pgxpool.Pool
}

func NewPatientService(db *pgxpool.Pool) *PatientService {
	return &PatientService{db: db}
}

type Patient struct {
	ID               string       `json:"id"`
	PatientNumber    string       `json:"patient_number"`
	FullName         string       `json:"full_name"`
	Age              int          `json:"age"`
	DateOfSubmission string       `json:"date_of_submission"` // YYYY-MM-DD
	CreatedBy        string       `json:"created_by"`
	CreatedAt        time.Time    `json:"created_at"`
	UpdatedAt        time.Time    `json:"updated_at"`
	LatestRiskLevel  *string      `json:"latest_risk_level"` // nil if no assessment yet
	Assessments      []Assessment `json:"assessments,omitempty"`
}

type CreatePatientParams struct {
	FullName         string
	Age              int
	DateOfSubmission string // YYYY-MM-DD; empty = today
	CreatedByClerkID string // resolved to users.id internally
}

func (s *PatientService) CreatePatient(ctx context.Context, p CreatePatientParams) (*Patient, error) {
	// Resolve clerk_id → users.id
	var creatorID string
	err := s.db.QueryRow(ctx,
		`SELECT id FROM users WHERE clerk_id=$1`, p.CreatedByClerkID,
	).Scan(&creatorID)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("creator user not found for clerk_id %q", p.CreatedByClerkID)
	}
	if err != nil {
		return nil, fmt.Errorf("resolve creator: %w", err)
	}

	// Generate next patient number atomically inside a transaction.
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var maxNum int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 2) AS INTEGER)), 0)
		FROM patients
	`).Scan(&maxNum)
	if err != nil {
		return nil, fmt.Errorf("compute next patient number: %w", err)
	}
	patientNumber := fmt.Sprintf("P%03d", maxNum+1)

	dos := p.DateOfSubmission
	if dos == "" {
		dos = time.Now().Format("2006-01-02")
	}

	var patient Patient
	err = tx.QueryRow(ctx, `
		INSERT INTO patients (patient_number, full_name, age, date_of_submission, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, patient_number, full_name, age,
		          TO_CHAR(date_of_submission, 'YYYY-MM-DD'), created_by, created_at, updated_at
	`, patientNumber, p.FullName, p.Age, dos, creatorID,
	).Scan(
		&patient.ID, &patient.PatientNumber, &patient.FullName, &patient.Age,
		&patient.DateOfSubmission, &patient.CreatedBy, &patient.CreatedAt, &patient.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert patient: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &patient, nil
}

func (s *PatientService) ListPatients(ctx context.Context) ([]Patient, error) {
	rows, err := s.db.Query(ctx, `
		SELECT
			p.id, p.patient_number, p.full_name, p.age,
			TO_CHAR(p.date_of_submission, 'YYYY-MM-DD'),
			p.created_by, p.created_at, p.updated_at,
			(SELECT a.risk_level FROM assessments a
			 WHERE a.patient_id = p.id
			 ORDER BY a.created_at DESC LIMIT 1) AS latest_risk_level
		FROM patients p
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list patients: %w", err)
	}
	defer rows.Close()

	var patients []Patient
	for rows.Next() {
		var p Patient
		if err := rows.Scan(
			&p.ID, &p.PatientNumber, &p.FullName, &p.Age,
			&p.DateOfSubmission, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
			&p.LatestRiskLevel,
		); err != nil {
			return nil, fmt.Errorf("scan patient: %w", err)
		}
		patients = append(patients, p)
	}
	return patients, rows.Err()
}

func (s *PatientService) GetPatient(ctx context.Context, id string) (*Patient, error) {
	var p Patient
	err := s.db.QueryRow(ctx, `
		SELECT id, patient_number, full_name, age,
		       TO_CHAR(date_of_submission, 'YYYY-MM-DD'), created_by, created_at, updated_at,
		       (SELECT a.risk_level FROM assessments a
		        WHERE a.patient_id = p.id
		        ORDER BY a.created_at DESC LIMIT 1) AS latest_risk_level
		FROM patients p WHERE p.id=$1
	`, id).Scan(
		&p.ID, &p.PatientNumber, &p.FullName, &p.Age,
		&p.DateOfSubmission, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		&p.LatestRiskLevel,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get patient: %w", err)
	}

	// Fetch associated assessments.
	aRows, err := s.db.Query(ctx, `
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
		FROM assessments WHERE patient_id=$1 ORDER BY created_at DESC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("fetch assessments: %w", err)
	}
	defer aRows.Close()

	p.Assessments, err = scanAssessments(aRows)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
