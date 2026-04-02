package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/proxascreen/backend/internal/middleware"
)

type DashboardHandler struct {
	db *pgxpool.Pool
}

func NewDashboardHandler(db *pgxpool.Pool) *DashboardHandler {
	return &DashboardHandler{db: db}
}

type adminStatsResponse struct {
	TotalClinicians    int `json:"total_clinicians"`
	TotalPatients      int `json:"total_patients"`
	TotalAssessments   int `json:"total_assessments"`
	TotalHighRisk      int `json:"total_high_risk"`
}

// GetStats returns aggregate numbers for the admin dashboard.
func (h *DashboardHandler) GetStats(c *gin.Context) {
	var stats adminStatsResponse
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT
			(SELECT COUNT(*) FROM users      WHERE role = 'clinician')      AS total_clinicians,
			(SELECT COUNT(*) FROM patients)                                  AS total_patients,
			(SELECT COUNT(*) FROM assessments)                               AS total_assessments,
			(SELECT COUNT(*) FROM assessments WHERE risk_level = 'High')     AS total_high_risk
	`).Scan(
		&stats.TotalClinicians,
		&stats.TotalPatients,
		&stats.TotalAssessments,
		&stats.TotalHighRisk,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

type clinicianStatsResponse struct {
	TotalPatients    int `json:"total_patients"`
	TotalAssessments int `json:"total_assessments"`
	HighRiskCount    int `json:"high_risk_count"`
	LowRiskCount     int `json:"low_risk_count"`
}

// GetClinicianStats returns stats scoped to the authenticated clinician.
func (h *DashboardHandler) GetClinicianStats(c *gin.Context) {
	clerkID, _ := c.Get(middleware.ContextKeyClerkID)

	// Resolve clerk_id → users.id
	var clinicianID string
	err := h.db.QueryRow(c.Request.Context(),
		`SELECT id FROM users WHERE clerk_id=$1`, clerkID,
	).Scan(&clinicianID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve user"})
		return
	}

	var stats clinicianStatsResponse
	err = h.db.QueryRow(c.Request.Context(), `
		SELECT
			(SELECT COUNT(DISTINCT patient_id) FROM assessments WHERE clinician_id = $1) AS total_patients,
			(SELECT COUNT(*)                   FROM assessments WHERE clinician_id = $1) AS total_assessments,
			(SELECT COUNT(*) FROM assessments  WHERE clinician_id = $1 AND risk_level = 'High') AS high_risk_count,
			(SELECT COUNT(*) FROM assessments  WHERE clinician_id = $1 AND risk_level = 'Low')  AS low_risk_count
	`, clinicianID).Scan(
		&stats.TotalPatients,
		&stats.TotalAssessments,
		&stats.HighRiskCount,
		&stats.LowRiskCount,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}
