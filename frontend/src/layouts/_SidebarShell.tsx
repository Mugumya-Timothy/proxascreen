/**
 * _SidebarShell.tsx — internal shared sidebar layout consumed by AdminLayout
 * and ClinicianLayout. Not exported from the layouts barrel; not used directly
 * by pages or routes.
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NavItem = {
  label: string
  to:    string
  icon:  React.ReactNode
}

type Props = {
  navItems: NavItem[]
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function SidebarShell({ navItems }: Props) {
  const { signOut }  = useClerk()
  const { user }     = useUser()
  const navigate     = useNavigate()

  const fullName  = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'User'
  const role      = ((user?.publicMetadata as { role?: string })?.role ?? 'clinician') as 'admin' | 'clinician'
  const initials  = fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col bg-white shadow-[1px_0_0_0_#f3f4f6]">

        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-gray-100 px-5">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Proxa<span className="text-primary">Screen</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-100',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center transition-colors',
                        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600',
                      ].join(' ')}>
                        {item.icon}
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-gray-100 p-4">
          {/* User info row */}
          <NavLink
            to="/settings/reset-password"
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-semibold text-white shadow-sm">
              {initials}
            </div>
            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 leading-tight">{fullName}</p>
              <span className={[
                'inline-block mt-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold capitalize',
                role === 'admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary/10 text-secondary-700',
              ].join(' ')}>
                {role}
              </span>
            </div>
          </NavLink>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <SignOutIcon className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ── Shared SVG assets ─────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="30" height="30" rx="8" fill="#57BEEB" />
      <path
        d="M8 15 C8 10 11.5 7.5 15 7.5 C18.5 7.5 22 10 22 15 C22 20 18.5 22.5 15 22.5"
        stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"
      />
      <circle cx="15" cy="15" r="2.8" fill="white" />
      <path
        d="M15 22.5 C12.5 22.5 10 21 8 18.5"
        stroke="#58C697" strokeWidth="2" strokeLinecap="round" fill="none"
      />
    </svg>
  )
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

// ── Nav icons (exported so layouts can import them) ───────────────────────────

export function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

export function IconPatients({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

export function IconClinicians({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

export function IconAddPatient({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}
