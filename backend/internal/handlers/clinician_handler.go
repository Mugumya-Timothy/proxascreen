package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/proxascreen/backend/internal/services"
)

type ClinicianHandler struct {
	userService *services.UserService
}

func NewClinicianHandler(userService *services.UserService) *ClinicianHandler {
	return &ClinicianHandler{userService: userService}
}

type createClinicianRequest struct {
	FirstName    string `json:"first_name" binding:"required"`
	LastName     string `json:"last_name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Phone        string `json:"phone"`
	TempPassword string `json:"temp_password" binding:"required,min=8"`
}

func (h *ClinicianHandler) CreateClinician(c *gin.Context) {
	var req createClinicianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.CreateClinician(c.Request.Context(), services.CreateClinicianParams{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		Phone:        req.Phone,
		TempPassword: req.TempPassword,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *ClinicianHandler) ListClinicians(c *gin.Context) {
	clinicians, err := h.userService.ListClinicians(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, clinicians)
}

func (h *ClinicianHandler) GetClinician(c *gin.Context) {
	id := c.Param("id")
	user, err := h.userService.GetClinician(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "clinician not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *ClinicianHandler) DeleteClinician(c *gin.Context) {
	id := c.Param("id")
	if err := h.userService.DeleteClinician(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "clinician not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
