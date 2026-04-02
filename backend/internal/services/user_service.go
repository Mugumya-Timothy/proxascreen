package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserService struct {
	db           *pgxpool.Pool
	emailService *EmailService
}

func NewUserService(db *pgxpool.Pool, clerkSecretKey string, emailService *EmailService) *UserService {
	clerk.SetKey(clerkSecretKey)
	return &UserService{
		db:           db,
		emailService: emailService,
	}
}

// ── Types ─────────────────────────────────────────────────────────────────────

type UpsertUserParams struct {
	ClerkID      string
	Email        string
	FullName     string
	Phone        string
	Role         string
	TempPassword *string
}

type User struct {
	ID              string  `json:"id"`
	ClerkID         string  `json:"clerk_id"`
	FullName        string  `json:"full_name"`
	Email           string  `json:"email"`
	Phone           *string `json:"phone"`
	Role            string  `json:"role"`
	IsPasswordReset bool    `json:"is_password_reset"`
}

type CreateClinicianParams struct {
	FirstName    string
	LastName     string
	Email        string
	Phone        string
	TempPassword string
}

// ── Webhook-driven upserts (called by webhook handler) ───────────────────────

func (s *UserService) CreateUser(ctx context.Context, p UpsertUserParams) error {
	if err := validateRole(p.Role); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO users (clerk_id, email, full_name, phone, role, temp_password)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (clerk_id) DO NOTHING
	`, p.ClerkID, p.Email, p.FullName, nullableString(p.Phone), p.Role, p.TempPassword)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (s *UserService) UpdateUser(ctx context.Context, p UpsertUserParams) error {
	if err := validateRole(p.Role); err != nil {
		return err
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE users
		SET email=$2, full_name=$3, phone=$4, role=$5, temp_password=$6, updated_at=NOW()
		WHERE clerk_id=$1
	`, p.ClerkID, p.Email, p.FullName, nullableString(p.Phone), p.Role, p.TempPassword)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user with clerk_id %q not found", p.ClerkID)
	}
	return nil
}

// ── Admin-driven clinician management ────────────────────────────────────────

// CreateClinician creates a Clerk user, stores public metadata, then emails credentials.
func (s *UserService) CreateClinician(ctx context.Context, p CreateClinicianParams) (*User, error) {
	meta, _ := json.Marshal(map[string]string{
		"role":          "clinician",
		"temp_password": p.TempPassword,
	})
	raw := json.RawMessage(meta)

	firstName := p.FirstName
	lastName := p.LastName
	password := p.TempPassword
	emails := []string{p.Email}

	clerkCreatedUser, err := clerkuser.Create(ctx, &clerkuser.CreateParams{
		FirstName:      &firstName,
		LastName:       &lastName,
		EmailAddresses: &emails,
		Password:       &password,
		PublicMetadata: &raw,
	})
	if err != nil {
		return nil, fmt.Errorf("create clerk user: %w", err)
	}

	// Persist to local DB — the webhook will also fire, but ON CONFLICT handles it.
	tp := p.TempPassword
	dbUser, err := s.insertAndReturnUser(ctx, UpsertUserParams{
		ClerkID:      clerkCreatedUser.ID,
		Email:        p.Email,
		FullName:     p.FirstName + " " + p.LastName,
		Phone:        p.Phone,
		Role:         "clinician",
		TempPassword: &tp,
	})
	if err != nil {
		return nil, err
	}

	// Send welcome email (non-fatal — log and continue on failure).
	if err := s.emailService.SendWelcomeEmail(p.Email, p.FirstName+" "+p.LastName, p.TempPassword); err != nil {
		log.Printf("warn: failed to send welcome email to %s: %v", p.Email, err)
	}

	return dbUser, nil
}

func (s *UserService) ListClinicians(ctx context.Context) ([]User, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, clerk_id, full_name, email, phone, role, is_password_reset
		FROM users
		WHERE role = 'clinician'
		ORDER BY full_name
	`)
	if err != nil {
		return nil, fmt.Errorf("list clinicians: %w", err)
	}
	defer rows.Close()
	return scanUsers(rows)
}

func (s *UserService) GetClinician(ctx context.Context, id string) (*User, error) {
	u, err := s.getUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u.Role != "clinician" {
		return nil, ErrNotFound
	}
	return u, nil
}

func (s *UserService) DeleteClinician(ctx context.Context, id string) error {
	// Fetch clerk_id before deleting locally.
	var clerkID string
	err := s.db.QueryRow(ctx,
		`SELECT clerk_id FROM users WHERE id=$1 AND role='clinician'`, id,
	).Scan(&clerkID)
	if err == pgx.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("lookup clinician: %w", err)
	}

	// Delete from Clerk first; if this fails we leave the DB row intact.
	if _, err := clerkuser.Delete(ctx, clerkID); err != nil {
		return fmt.Errorf("delete clerk user: %w", err)
	}

	if _, err := s.db.Exec(ctx, `DELETE FROM users WHERE id=$1`, id); err != nil {
		return fmt.Errorf("delete user from db: %w", err)
	}
	return nil
}

// MarkPasswordReset sets is_password_reset=true for the given clerk_id.
func (s *UserService) MarkPasswordReset(ctx context.Context, clerkID string) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET is_password_reset=true, updated_at=NOW() WHERE clerk_id=$1`,
		clerkID,
	)
	if err != nil {
		return fmt.Errorf("mark password reset: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateClerkPassword calls the Clerk API to set a new password for the user.
func (s *UserService) UpdateClerkPassword(ctx context.Context, clerkID, newPassword string) error {
	_, err := clerkuser.Update(ctx, clerkID, &clerkuser.UpdateParams{
		Password: &newPassword,
	})
	if err != nil {
		return fmt.Errorf("update clerk password: %w", err)
	}
	return nil
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func (s *UserService) insertAndReturnUser(ctx context.Context, p UpsertUserParams) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		INSERT INTO users (clerk_id, email, full_name, phone, role, temp_password)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (clerk_id) DO UPDATE
			SET email=EXCLUDED.email, full_name=EXCLUDED.full_name,
			    phone=EXCLUDED.phone, updated_at=NOW()
		RETURNING id, clerk_id, full_name, email, phone, role, is_password_reset
	`, p.ClerkID, p.Email, p.FullName, nullableString(p.Phone), p.Role, p.TempPassword,
	).Scan(&u.ID, &u.ClerkID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsPasswordReset)
	if err != nil {
		return nil, fmt.Errorf("insert clinician: %w", err)
	}
	return &u, nil
}

func (s *UserService) GetUserByClerkID(ctx context.Context, clerkID string) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		SELECT id, clerk_id, full_name, email, phone, role, is_password_reset
		FROM users WHERE clerk_id=$1
	`, clerkID).Scan(&u.ID, &u.ClerkID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsPasswordReset)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by clerk_id: %w", err)
	}
	return &u, nil
}

func (s *UserService) getUserByID(ctx context.Context, id string) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		SELECT id, clerk_id, full_name, email, phone, role, is_password_reset
		FROM users WHERE id=$1
	`, id).Scan(&u.ID, &u.ClerkID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsPasswordReset)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}

func scanUsers(rows pgx.Rows) ([]User, error) {
	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.ClerkID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsPasswordReset); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func validateRole(role string) error {
	switch role {
	case "admin", "clinician":
		return nil
	default:
		return fmt.Errorf("invalid role %q: must be admin or clinician", role)
	}
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
