/**
 * _SidebarShell.tsx — internal shared sidebar layout consumed by AdminLayout
 * and ClinicianLayout. Not exported from the layouts barrel; not used directly
 * by pages or routes.
 */
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useCurrentUser } from '../hooks/useAuth'

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
  const { signOut }     = useClerk()
  const { user }        = useUser()
  const navigate        = useNavigate()
  const [open, setOpen] = useState(false)

  const fullName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'User'
  const email    = user?.primaryEmailAddress?.emailAddress ?? ''
  const { data: currentUser } = useCurrentUser()
  const role     = (currentUser?.role ?? 'clinician') as 'admin' | 'clinician'
  const initials = fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  // ── Sidebar inner content (reused for both fixed mobile & static desktop) ──
  const sidebarBody = (
    <div
      className="flex h-full flex-col"
      style={{ background: 'linear-gradient(180deg, #0d2e45 0%, #1a4f6d 100%)' }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <LogoMark />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[19px] tracking-tight text-white">
            <span className="font-light">Proxa</span>
            <span className="font-bold">Screen</span>
          </span>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/dashboard' || item.to.endsWith('/dashboard')}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active background */}
                    {isActive && (
                      <span
                        className="absolute inset-0 rounded-xl"
                        style={{ background: 'rgba(95,176,227,0.13)' }}
                      />
                    )}
                    {/* Active left accent bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{ background: '#5FB0E3' }}
                      />
                    )}
                    {/* Icon */}
                    <span
                      className={[
                        'relative flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-white/35 group-hover:text-white/65',
                      ].join(' ')}
                    >
                      {item.icon}
                    </span>
                    {/* Label */}
                    <span className="relative tracking-wide">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-white/10" />

      {/* ── User footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-1 p-3">
        <NavLink
          to="/settings/reset-password"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
        >
          {/* Gradient avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow"
            style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {fullName}
            </p>
            {email && (
              <p className="mt-0.5 truncate text-[11px] leading-tight text-white/35">
                {email}
              </p>
            )}
          </div>

          {/* Settings caret hint */}
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
        </NavLink>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <SignOutIcon className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Mobile overlay backdrop ────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar — fixed on mobile, static on desktop ──────────────────── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-300 ease-in-out',
          'md:relative md:z-auto md:shadow-none md:translate-x-0 md:flex md:shrink-0 md:flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarBody}
      </aside>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Open navigation"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <LogoMark />
            <span style={{ fontSize: '16px', color: '#5FB0E3' }}>
              <span style={{ fontWeight: 300 }}>Proxa</span>
              <span style={{ fontWeight: 700 }}>Screen</span>
            </span>
          </div>

          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5FB0E3 0%, #58C697 100%)' }}
          >
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Shared SVG assets ─────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <img src="/logo.png" alt="ProxaScreen logo" width={30} height={30} className="shrink-0" />
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

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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
