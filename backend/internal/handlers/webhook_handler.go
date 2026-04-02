package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	svix "github.com/svix/svix-webhooks/go"

	"github.com/proxascreen/backend/internal/services"
)

// clerkEvent is the top-level envelope sent by Clerk for every webhook event.
type clerkEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// clerkUserData is the shape of the `data` field for user.created / user.updated.
type clerkUserData struct {
	ID             string              `json:"id"`
	EmailAddresses []clerkEmailAddress `json:"email_addresses"`
	FirstName      string              `json:"first_name"`
	LastName       string              `json:"last_name"`
	PhoneNumbers   []clerkPhoneNumber  `json:"phone_numbers"`
	PublicMetadata clerkPublicMetadata `json:"public_metadata"`
}

type clerkEmailAddress struct {
	EmailAddress string `json:"email_address"`
}

type clerkPhoneNumber struct {
	PhoneNumber string `json:"phone_number"`
}

type clerkPublicMetadata struct {
	Role         string `json:"role"`
	TempPassword string `json:"temp_password"`
}

// WebhookHandler holds dependencies for the Clerk webhook route.
type WebhookHandler struct {
	wh          *svix.Webhook
	userService *services.UserService
}

// NewWebhookHandler constructs the handler and initialises the svix verifier.
func NewWebhookHandler(clerkWebhookSecret string, userService *services.UserService) (*WebhookHandler, error) {
	wh, err := svix.NewWebhook(clerkWebhookSecret)
	if err != nil {
		return nil, err
	}
	return &WebhookHandler{wh: wh, userService: userService}, nil
}

// HandleClerkWebhook is the POST /webhooks/clerk route handler.
func (h *WebhookHandler) HandleClerkWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot read body"})
		return
	}

	// Verify signature using the raw body and original headers.
	if err := h.wh.Verify(body, c.Request.Header); err != nil {
		log.Printf("clerk webhook signature verification failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	var event clerkEvent
	if err := json.Unmarshal(body, &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed payload"})
		return
	}

	switch event.Type {
	case "user.created":
		h.handleUserCreated(c, event.Data)
	case "user.updated":
		h.handleUserUpdated(c, event.Data)
	default:
		// Acknowledge unknown events so Clerk does not retry them.
		c.JSON(http.StatusOK, gin.H{"received": true})
	}
}

func (h *WebhookHandler) handleUserCreated(c *gin.Context, raw json.RawMessage) {
	user, ok := parseUserData(c, raw)
	if !ok {
		return
	}

	params := buildUpsertParams(user)
	if err := h.userService.CreateUser(c.Request.Context(), params); err != nil {
		log.Printf("user.created: failed to insert user %s: %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	log.Printf("user.created: inserted user %s (%s)", user.ID, params.Email)
	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (h *WebhookHandler) handleUserUpdated(c *gin.Context, raw json.RawMessage) {
	user, ok := parseUserData(c, raw)
	if !ok {
		return
	}

	params := buildUpsertParams(user)
	if err := h.userService.UpdateUser(c.Request.Context(), params); err != nil {
		log.Printf("user.updated: failed to update user %s: %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	log.Printf("user.updated: updated user %s (%s)", user.ID, params.Email)
	c.JSON(http.StatusOK, gin.H{"received": true})
}

// parseUserData decodes the raw Clerk user payload and writes an error response on failure.
func parseUserData(c *gin.Context, raw json.RawMessage) (clerkUserData, bool) {
	var user clerkUserData
	if err := json.Unmarshal(raw, &user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed user data"})
		return clerkUserData{}, false
	}
	return user, true
}

// buildUpsertParams maps Clerk's user data onto our internal params struct.
func buildUpsertParams(user clerkUserData) services.UpsertUserParams {
	email := ""
	if len(user.EmailAddresses) > 0 {
		email = user.EmailAddresses[0].EmailAddress
	}

	phone := ""
	if len(user.PhoneNumbers) > 0 {
		phone = user.PhoneNumbers[0].PhoneNumber
	}

	role := user.PublicMetadata.Role
	if role == "" {
		role = "clinician" // safe default
	}

	var tempPassword *string
	if tp := user.PublicMetadata.TempPassword; tp != "" {
		tempPassword = &tp
	}

	return services.UpsertUserParams{
		ClerkID:      user.ID,
		Email:        email,
		FullName:     user.FirstName + " " + user.LastName,
		Phone:        phone,
		Role:         role,
		TempPassword: tempPassword,
	}
}
