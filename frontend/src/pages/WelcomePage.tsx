import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import api from '../services/api'
import type { User } from '../types'

export default function WelcomePage() {
  const { isSignedIn } = useAuth()
  const navigate       = useNavigate()

  useEffect(() => {
    if (!isSignedIn) return
    api.get<User>('/api/v1/auth/me').then(({ data: user }) => {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }).catch(() => {
      navigate('/dashboard', { replace: true })
    })
  }, [isSignedIn, navigate])

  return (
    <div
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #f0f9fe 0%, #f8fffe 55%, #f0fdf8 100%)' }}
    >
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#57BEEB" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wgrid)" />
        </svg>
        <div className="absolute -top-64 -right-64 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-64 -left-64 h-[600px] w-[600px] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      {/* ── Centered content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo */}
        <img
          src="/logo.png"
          alt="ProxaScreen logo"
          width={80}
          height={80}
          className="mb-5 drop-shadow-md"
        />

        {/* Brand name */}
        <div style={{ fontSize: '52px', lineHeight: 1, letterSpacing: '-0.5px', color: '#57BEEB' }}>
          <span style={{ fontWeight: 400 }}>Proxa</span>
          <span style={{ fontWeight: 700 }}>Screen</span>
        </div>

        {/* Sub-brand */}
        <p
          className="mt-2 mb-10"
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: '#b0b0b0',
          }}
        >
          Prostate Cancer Risk Screening
        </p>

        {/* Sign In button */}
        <Link
          to="/sign-in"
          className="group inline-flex items-center gap-3 rounded-2xl px-7 py-3.5 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
          style={{
            background: 'linear-gradient(135deg, #57BEEB 0%, #2aa8dd 100%)',
            boxShadow: '0 6px 24px 0 rgba(87,190,235,0.40)',
          }}
        >
          <LockIcon className="h-4 w-4 text-white/80" />
          Access Secure Portal
        </Link>
      </div>

      {/* Bottom SSL badge */}
      <div className="absolute bottom-6 z-10 flex items-center gap-1.5 text-xs text-gray-300">
        <ShieldIcon className="h-3.5 w-3.5" />
        <span>256-bit SSL encrypted · © {new Date().getFullYear()} ProxaScreen</span>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
      viewBox="0 0 24 24" strokeWidth={1.9} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
      viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
