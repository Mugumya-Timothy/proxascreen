package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/proxascreen/backend/internal/middleware"
	"github.com/proxascreen/backend/internal/services"
)

type PatientHandler struct {
	patientService    *services.PatientService
	assessmentService *services.AssessmentService
}

func NewPatientHandler(patientService *services.PatientService, assessmentService *services.AssessmentService) *PatientHandler {
	return &PatientHandler{patientService: patientService, assessmentService: assessmentService}
}

type createPatientRequest struct {
	FullName               string            `json:"full_name" binding:"required"`
	Age                    int               `json:"age" binding:"required,min=1,max=120"`
	DateOfSubmission       string            `json:"date_of_submission"` // optional, YYYY-MM-DD
	BMI                    float64           `json:"bmi" binding:"required,gt=0"`
	Smoker                 bool              `json:"smoker"`
	DietType               string            `json:"diet_type" binding:"required,oneof=fatty mixed healthy"`
	PhysicalActivityLevel  string            `json:"physical_activity_level" binding:"required,oneof=low moderate high"`
	AlcoholConsumption     string            `json:"alcohol_consumption" binding:"required,oneof=no moderate high"`
	FamilyHistoryRelatives []string          `json:"family_history_relatives"`
	RegularHealthCheckup   bool              `json:"regular_health_checkup"`
	ProstateExamDone       bool              `json:"prostate_exam_done"`
	SymptomDict            map[string]string `json:"symptom_dict"`
}

type createPatientResponse struct {
	Patient    *services.Patient    `json:"patient"`
	Assessment *services.Assessment `json:"assessment"`
}

func (h *PatientHandler) CreatePatient(c *gin.Context) {
	var req createPatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clerkID, _ := c.Get(middleware.ContextKeyClerkID)

	patient, err := h.patientService.CreatePatient(c.Request.Context(), services.CreatePatientParams{
		FullName:         req.FullName,
		Age:              req.Age,
		DateOfSubmission: req.DateOfSubmission,
		CreatedByClerkID: clerkID.(string),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	assessment, err := h.assessmentService.CreateAssessment(c.Request.Context(), services.CreateAssessmentParams{
		PatientID:              patient.ID,
		ClinicianClerkID:       clerkID.(string),
		Age:                    float64(req.Age),
		BMI:                    req.BMI,
		Smoker:                 req.Smoker,
		DietType:               req.DietType,
		PhysicalActivityLevel:  req.PhysicalActivityLevel,
		AlcoholConsumption:     req.AlcoholConsumption,
		FamilyHistoryRelatives: req.FamilyHistoryRelatives,
		RegularHealthCheckup:   req.RegularHealthCheckup,
		ProstateExamDone:       req.ProstateExamDone,
		SymptomDict:            req.SymptomDict,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "patient created but assessment failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, createPatientResponse{
		Patient:    patient,
		Assessment: assessment,
	})
}

func (h *PatientHandler) ListPatients(c *gin.Context) {
	patients, err := h.patientService.ListPatients(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, patients)
}

func (h *PatientHandler) GetPatient(c *gin.Context) {
	patient, err := h.patientService.GetPatient(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, patient)
}

func (h *PatientHandler) ListPatientAssessments(c *gin.Context) {
	patient, err := h.patientService.GetPatient(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, patient.Assessments)
}

// BulkImportPatients is handled separately in bulk_import_handler.go.
func (h *PatientHandler) BulkImportPatients(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "use /patients/bulk-import"})
}
