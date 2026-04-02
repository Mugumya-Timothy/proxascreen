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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Something went wrong!</h1>
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
