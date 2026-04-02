package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/proxascreen/backend/internal/middleware"
	"github.com/proxascreen/backend/internal/services"
)

type AuthHandler struct {
	userService  *services.UserService
	emailService *services.EmailService
}

func NewAuthHandler(userService *services.UserService, emailService *services.EmailService) *AuthHandler {
	return &AuthHandler{userService: userService, emailService: emailService}
}

type resetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// ResetPassword updates the caller's password via Clerk, marks is_password_reset=true
// in the DB, and sends a confirmation email.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clerkID, _ := c.Get(middleware.ContextKeyClerkID)
	id := clerkID.(string)

	if err := h.userService.UpdateClerkPassword(c.Request.Context(), id, req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	if err := h.userService.MarkPasswordReset(c.Request.Context(), id); err != nil {
		// Non-fatal — password was changed in Clerk, log the DB miss and continue.
		log.Printf("warn: could not set is_password_reset for clerk_id %s: %v", id, err)
	}

	// Look up email + name for the confirmation email (non-fatal on failure).
	if user, err := h.userService.GetUserByClerkID(c.Request.Context(), id); err == nil {
		if err := h.emailService.SendPasswordResetConfirmationEmail(user.Email, user.FullName); err != nil {
			log.Printf("warn: failed to send password reset confirmation to %s: %v", user.Email, err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated successfully"})
}

// GetMe returns the authenticated user's profile from the local database.
func (h *AuthHandler) GetMe(c *gin.Context) {
	clerkID, _ := c.Get(middleware.ContextKeyClerkID)
	user, err := h.userService.GetUserByClerkID(c.Request.Context(), clerkID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}
