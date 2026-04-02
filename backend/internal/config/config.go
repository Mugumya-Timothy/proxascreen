package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL         string
	ClerkSecretKey      string
	ClerkPublishableKey string
	ClerkWebhookSecret  string
	ResendAPIKey        string
	ModelServiceURL     string
	AppURL              string
	Port                string
}

func Load() *Config {
	// Load .env if present; ignore error in production (vars already in env)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := &Config{
		DatabaseURL:         mustGet("DATABASE_URL"),
		ClerkSecretKey:      mustGet("CLERK_SECRET_KEY"),
		ClerkPublishableKey: mustGet("CLERK_PUBLISHABLE_KEY"),
		ClerkWebhookSecret:  mustGet("CLERK_WEBHOOK_SECRET"),
		ResendAPIKey:        mustGet("RESEND_API_KEY"),
		ModelServiceURL:     getOrDefault("MODEL_SERVICE_URL", "http://model-service:8000"),
		AppURL:              getOrDefault("APP_URL", "http://localhost:5173"),
		Port:                getOrDefault("PORT", "8081"),
	}

	return cfg
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %q is not set", key)
	}
	return v
}

func getOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
