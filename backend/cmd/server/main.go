package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/proxascreen/backend/internal/config"
	"github.com/proxascreen/backend/internal/database"
	"github.com/proxascreen/backend/internal/routes"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	if err := routes.Register(r, db, cfg); err != nil {
		log.Fatalf("Failed to register routes: %v", err)
	}

	log.Printf("Starting server on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
