import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'

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
  const { user }                  = useUser()

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

  // ── 3. Role check ─────────────────────────────────────────────────────────
  if (requiredRole) {
    const role = (user?.publicMetadata as { role?: string })?.role as
      | 'admin'
      | 'clinician'
      | undefined

    const permitted =
      requiredRole === 'admin'
        ? role === 'admin'
        : role === 'clinician' || role === 'admin' // admin passes clinician gates

    if (!permitted) {
      // Send to the user's own correct dashboard rather than a generic 403.
      return <Navigate to="/dashboard" replace />
    }
  }

  // ── 4. Authorised ─────────────────────────────────────────────────────────
  return <>{children ?? <Outlet />}</>
}
