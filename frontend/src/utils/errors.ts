/**
 * Maps HTTP status codes and Clerk error codes to user-friendly messages.
 * All technical/developer-facing error detail is kept out of the UI.
 */

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Please check your input and try again.',
  401: 'You need to be signed in to do that.',
  403: "You don't have permission to do that.",
  404: 'The requested record could not be found.',
  409: 'This record already exists.',
  422: 'Please check your input and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
}

export function friendlyApiError(status: number | undefined): string {
  if (status !== undefined && status in STATUS_MESSAGES) {
    return STATUS_MESSAGES[status]
  }
  return 'Something went wrong. Please try again.'
}

const CLERK_CODE_MESSAGES: Record<string, string> = {
  form_password_incorrect:     'Incorrect password. Please try again.',
  form_identifier_not_found:   'No account found with that email address.',
  form_code_incorrect:         'The code you entered is incorrect. Please try again.',
  verification_expired:        'The verification code has expired. Please request a new one.',
  too_many_requests:           'Too many attempts. Please wait a moment and try again.',
  resource_not_found:          'The requested record could not be found.',
  session_exists:              "You're already signed in.",
  not_allowed_access:          "You don't have permission to do that.",
  form_identifier_exists:      'An account with that email already exists.',
  form_password_pwned:         'That password is too common. Please choose a different one.',
  form_password_length_too_short: 'Password must be at least 8 characters.',
}

export function friendlyClerkError(err: unknown, fallback: string): string {
  const clerkErr = err as { errors?: { code?: string }[] }
  const code = clerkErr?.errors?.[0]?.code
  if (code && code in CLERK_CODE_MESSAGES) {
    return CLERK_CODE_MESSAGES[code]
  }
  return fallback
}
