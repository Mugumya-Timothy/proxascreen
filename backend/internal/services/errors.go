package services

import (
	"errors"
	"strings"
)

var ErrNotFound = errors.New("not found")

// IsBlockedError returns true when the model service rejected the assessment
// due to an eligibility gate (e.g. patient age < 40).
func IsBlockedError(err error) bool {
	if err == nil {
		return false
	}
	return strings.HasPrefix(err.Error(), "assessment blocked:")
}
