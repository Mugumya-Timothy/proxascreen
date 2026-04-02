package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkjwt "github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
)

// Context keys used to pass authenticated identity to handlers.
const (
	ContextKeyClerkID = "clerk_id"
	ContextKeyRole    = "role"
)

// customClaims matches the JWT template that must be configured in the
// Clerk dashboard to include {{ user.public_metadata.role }} as "role".
// Without the template the role field will be an empty string.
type customClaims struct {
	Role string `json:"role"`
}

// RequireAuth verifies the Clerk Bearer JWT and sets clerk_id + role on the
// Gin context. Returns 401 on missing/invalid token.
func RequireAuth(clerkSecretKey string) gin.HandlerFunc {
	clerk.SetKey(clerkSecretKey)

	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		claims, err := clerkjwt.Verify(c.Request.Context(), &clerkjwt.VerifyParams{
			Token: token,
			CustomClaimsConstructor: func(_ context.Context) any {
				return &customClaims{}
			},
		})
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		role := ""
		if cc, ok := claims.Custom.(*customClaims); ok {
			role = cc.Role
		}

		c.Set(ContextKeyClerkID, claims.Subject)
		c.Set(ContextKeyRole, role)
		c.Next()
	}
}

// RequireRole returns a middleware that aborts with 403 if the authenticated
// user's role is not in the allowed set. Must be chained after RequireAuth.
func RequireRole(allowed ...string) gin.HandlerFunc {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, r := range allowed {
		allowedSet[r] = struct{}{}
	}

	return func(c *gin.Context) {
		role, _ := c.Get(ContextKeyRole)
		if _, ok := allowedSet[role.(string)]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}

func extractBearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
