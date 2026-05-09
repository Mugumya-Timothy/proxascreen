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

// DeletePatient removes a single patient record by UUID (admin-only).
func (h *PatientHandler) DeletePatient(c *gin.Context) {
	id := c.Param("id")
	if err := h.patientService.DeletePatient(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "patient deleted"})
}

type bulkDeleteRequest struct {
	// IDs is a list of patient UUIDs to delete.
	IDs []string `json:"ids"`
	// PatientNumbers is a list of patient_number strings (e.g. "P001").
	PatientNumbers []string `json:"patient_numbers"`
	// RangeFrom and RangeTo allow specifying a patient_number range (e.g. "P001" to "P050").
	RangeFrom string `json:"range_from"`
	RangeTo   string `json:"range_to"`
}

// BulkDeletePatients deletes multiple patients by IDs, patient_numbers, or a range (admin-only).
func (h *PatientHandler) BulkDeletePatients(c *gin.Context) {
	var req bulkDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	params := services.BulkDeleteParams{
		IDs:            req.IDs,
		PatientNumbers: req.PatientNumbers,
	}

	// Resolve range_from/range_to into a PatientNumbers list via DB query.
	if req.RangeFrom != "" && req.RangeTo != "" {
		var nums []string
		rows, err := h.patientService.ListPatientNumbersInRange(c.Request.Context(), req.RangeFrom, req.RangeTo)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		nums = rows
		if len(params.PatientNumbers) > 0 {
			params.PatientNumbers = append(params.PatientNumbers, nums...)
		} else {
			params.PatientNumbers = nums
		}
	}

	if len(params.IDs) == 0 && len(params.PatientNumbers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provide ids, patient_numbers, or range_from+range_to"})
		return
	}

	result, err := h.patientService.BulkDeletePatients(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// BulkImportPatients is handled separately in bulk_import_handler.go.
func (h *PatientHandler) BulkImportPatients(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "use /patients/bulk-import"})
}
