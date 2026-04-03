package routes

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/proxascreen/backend/internal/config"
	"github.com/proxascreen/backend/internal/handlers"
	"github.com/proxascreen/backend/internal/middleware"
	"github.com/proxascreen/backend/internal/services"
)

func Register(r *gin.Engine, db *pgxpool.Pool, cfg *config.Config) error {
	r.Use(middleware.CORS([]string{
		"http://localhost:5173",
		"http://localhost:5174",
		"https://proxascreen.me",
		"https://www.proxascreen.me",
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ── Services ──────────────────────────────────────────────────────────────
	emailService := services.NewEmailService(cfg.ResendAPIKey, cfg.AppURL)
	userService := services.NewUserService(db, cfg.ClerkSecretKey, emailService)
	patientService := services.NewPatientService(db)
	assessmentService := services.NewAssessmentService(db, cfg.ModelServiceURL)

	// ── Public ────────────────────────────────────────────────────────────────
	webhookHandler, err := handlers.NewWebhookHandler(cfg.ClerkWebhookSecret, userService)
	if err != nil {
		return err
	}
	r.POST("/webhooks/clerk", webhookHandler.HandleClerkWebhook)

	// ── Authenticated base group ───────────────────────────────────────────────
	auth := r.Group("/api/v1")
	auth.Use(middleware.RequireAuth(cfg.ClerkSecretKey, func(ctx context.Context, clerkID string) (string, error) {
		user, err := userService.GetUserByClerkID(ctx, clerkID)
		if err != nil {
			return "", err
		}
		return user.Role, nil
	}))

	// ── Handler instances ─────────────────────────────────────────────────────
	clinicianHandler := handlers.NewClinicianHandler(userService)
	patientHandler := handlers.NewPatientHandler(patientService, assessmentService)
	assessmentHandler := handlers.NewAssessmentHandler(assessmentService)
	dashboardHandler := handlers.NewDashboardHandler(db, cfg.ModelServiceURL)
	authHandler := handlers.NewAuthHandler(userService, emailService)
	bulkImportHandler := handlers.NewBulkImportHandler(patientService, assessmentService)

	// ── Both roles (clinician + admin) ────────────────────────────────────────
	bothRoles := middleware.RequireRole("clinician", "admin")

	auth.GET("/auth/me", bothRoles, authHandler.GetMe)
	auth.GET("/dashboard/clinician-stats", bothRoles, dashboardHandler.GetClinicianStats)
	auth.POST("/auth/reset-password", bothRoles, authHandler.ResetPassword)

	// ── Clinician-protected (clinician or admin) ───────────────────────────────
	clinician := auth.Group("/", bothRoles)

	clinician.GET("/patients", patientHandler.ListPatients)
	clinician.POST("/patients", patientHandler.CreatePatient)
	clinician.GET("/patients/:id", patientHandler.GetPatient)
	clinician.GET("/patients/:id/assessments", patientHandler.ListPatientAssessments)
	clinician.POST("/patients/:id/assessments", assessmentHandler.CreateAssessment)
	clinician.GET("/assessments/:id", assessmentHandler.GetAssessment)

	// ── Admin-only ────────────────────────────────────────────────────────────
	admin := auth.Group("/", middleware.RequireRole("admin"))

	admin.POST("/clinicians", clinicianHandler.CreateClinician)
	admin.GET("/clinicians", clinicianHandler.ListClinicians)
	admin.GET("/clinicians/:id", clinicianHandler.GetClinician)
	admin.DELETE("/clinicians/:id", clinicianHandler.DeleteClinician)
	admin.POST("/patients/bulk-import", bulkImportHandler.BulkImportPatients)
	admin.GET("/dashboard/stats", dashboardHandler.GetStats)
	admin.GET("/dashboard/services-health", dashboardHandler.GetServicesHealth)

	return nil
}
