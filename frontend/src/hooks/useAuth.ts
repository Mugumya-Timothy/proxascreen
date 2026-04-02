import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { User, ResetPasswordRequest } from '../types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const AUTH_KEYS = {
  currentUser: ['current-user'] as const,
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const fetchCurrentUser = (): Promise<User> =>
  api.get<User>('/api/v1/auth/me').then((r) => r.data)

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the signed-in user's profile from the backend.
 * Returns the full User object including role and password-reset status.
 */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: AUTH_KEYS.currentUser,
    queryFn:  fetchCurrentUser,
    enabled,
    retry:    1,
  })
}

/**
 * Mutation to reset the current user's password.
 * On success, invalidates the current-user cache so role/status is re-fetched.
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useResetPassword()
 *   mutate({ new_password: '...' }, { onSuccess: () => navigate('/dashboard') })
 */
export function useResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) =>
      api
        .post<{ message: string }>('/api/v1/auth/reset-password', data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.currentUser })
    },
  })
}
