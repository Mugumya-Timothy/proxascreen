import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useCurrentUser } from '../hooks/useAuth'

type Props = {
  /**
   * When provided, the route is only accessible to users whose
   * public_metadata.role matches this value.
   *
   * Role hierarchy:
   *   'admin'     → admin only
   *   'clinician' → clinician OR admin (admin has all clinician privileges)
   *   undefined   → any authenticated user
   */
  requiredRole?: 'admin' | 'clinician'

  /**
   * Optional render-prop override. When omitted, <Outlet /> is rendered,
   * making the component suitable as a layout-route wrapper in React Router v6.
   */
  children?: React.ReactNode
}

/**
 * ProtectedRoute
 *
 * Usage patterns (both are valid):
 *
 *   // As a layout route — children rendered via <Outlet />
 *   <Route element={<ProtectedRoute requiredRole="admin" />}>
 *     <Route path="clinicians" element={<CliniciansPage />} />
 *   </Route>
 *
 *   // As an explicit wrapper
 *   <ProtectedRoute requiredRole="clinician">
 *     <SomeComponent />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ requiredRole, children }: Props) {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isError: isCurrentUserError,
  } = useCurrentUser(isSignedIn)

  // ── 1. Clerk is still initialising ───────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // ── 2. Not authenticated → send to login ─────────────────────────────────
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  // ── 3. Backend profile is still loading ──────────────────────────────────
  if (isCurrentUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // ── 4. Backend profile could not be resolved ─────────────────────────────
  if (isCurrentUserError || !currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">

        {/* Subtle top accent bar */}
        <div className="fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

        <div className="w-full max-w-md text-center">

          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img src="/logo.png" alt="ProxaScreen" className="h-20 w-auto" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            We'll be right back
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            ProxaScreen is temporarily unable to load your profile.
            Our team has been notified. Please try again in a moment.
          </p>

          {/* Divider */}
          <div className="my-6 border-t border-gray-100" />

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/30 transition hover:brightness-105 active:scale-95"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Reload Page
            </button>
            <a
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95"
            >
              Back to Sign In
            </a>
          </div>

          {/* Footer note */}
          <p className="mt-10 text-xs text-gray-400">
            ProxaScreen · Prostate Cancer Risk Screening Platform
          </p>
        </div>
      </div>
    )
  }

  // ── 5. Role check ─────────────────────────────────────────────────────────
  if (requiredRole) {
    const role = currentUser.role

    const permitted =
      requiredRole === 'admin'
        ? role === 'admin'
        : role === 'clinician' || role === 'admin' // admin passes clinician gates

    if (!permitted) {
      return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
    }
  }

  // ── 6. Authorised ─────────────────────────────────────────────────────────
  return <>{children ?? <Outlet />}</>
}
