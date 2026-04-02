package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/proxascreen/backend/internal/middleware"
	"github.com/proxascreen/backend/internal/services"
)

type AssessmentHandler struct {
	assessmentService *services.AssessmentService
}

func NewAssessmentHandler(assessmentService *services.AssessmentService) *AssessmentHandler {
	return &AssessmentHandler{assessmentService: assessmentService}
}

type createAssessmentRequest struct {
	Age                   float64 `json:"age" binding:"required,gt=0"`
	BMI                   float64 `json:"bmi" binding:"required,gt=0"`
	Smoker                bool    `json:"smoker"`
	DietType              string  `json:"diet_type" binding:"required,oneof=fatty mixed healthy"`
	PhysicalActivityLevel string  `json:"physical_activity_level" binding:"required,oneof=low moderate high"`
	FamilyHistory         bool    `json:"family_history"`
	RegularHealthCheckup  bool    `json:"regular_health_checkup"`
	ProstateExamDone      bool    `json:"prostate_exam_done"`
}

func (h *AssessmentHandler) CreateAssessment(c *gin.Context) {
	var req createAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clerkID, _ := c.Get(middleware.ContextKeyClerkID)
	assessment, err := h.assessmentService.CreateAssessment(c.Request.Context(), services.CreateAssessmentParams{
		PatientID:             c.Param("id"),
		ClinicianClerkID:      clerkID.(string),
		Age:                   req.Age,
		BMI:                   req.BMI,
		Smoker:                req.Smoker,
		DietType:              req.DietType,
		PhysicalActivityLevel: req.PhysicalActivityLevel,
		FamilyHistory:         req.FamilyHistory,
		RegularHealthCheckup:  req.RegularHealthCheckup,
		ProstateExamDone:      req.ProstateExamDone,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, assessment)
}

func (h *AssessmentHandler) GetAssessment(c *gin.Context) {
	assessment, err := h.assessmentService.GetAssessment(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assessment)
}
