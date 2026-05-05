import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import api from '../services/api'
import type { User } from '../types'

export default function WelcomePage() {
  const { isSignedIn } = useAuth()
  const navigate       = useNavigate()

  // ── Typing animation for "Predict." ───────────────────────────────
  // Phases: typing → hold (10s) → fading → wait → typing …
  const WORD = 'Predict.'
  const [typed, setTyped]           = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [fading, setFading]         = useState(false)
  const phase   = useRef<'typing' | 'hold' | 'fading' | 'wait'>('typing')
  const charIdx = useRef(0)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const typeDelay = (char: string, idx: number): number => {
      if (char === '.') return 260
      if (idx === 0)    return 180
      const base = 90 + Math.random() * 60
      return Math.random() < 0.12 ? base + 200 : base
    }

    const tick = () => {
      if (phase.current === 'typing') {
        const idx  = charIdx.current
        const next = WORD.slice(0, idx + 1)
        setTyped(next)
        charIdx.current = idx + 1
        if (next === WORD) {
          phase.current = 'hold'
          timeout = setTimeout(tick, 10_000)   // stay visible for 10 seconds
        } else {
          timeout = setTimeout(tick, typeDelay(WORD[idx], idx))
        }
      } else if (phase.current === 'hold') {
        // start CSS fade-out (700 ms transition)
        setFading(true)
        phase.current = 'fading'
        timeout = setTimeout(tick, 750)
      } else if (phase.current === 'fading') {
        // fade done — reset
        setFading(false)
        setTyped('')
        charIdx.current = 0
        phase.current   = 'wait'
        timeout = setTimeout(tick, 600)        // brief pause before re-typing
      } else {
        phase.current = 'typing'
        timeout = setTimeout(tick, 60)
      }
    }

    timeout = setTimeout(tick, 800)
    return () => clearTimeout(timeout)
  }, [])

  // blinking cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor(v => !v), 500)
    return () => clearInterval(id)
  }, [])

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
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d2e45 0%, #1a4f6d 100%)' }}
    >
      {/* ── Background grid pattern ──────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wgrid)" />
        </svg>
        {/* Subtle radial glow in centre */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(95,176,227,0.18) 0%, transparent 70%)' }}
        />
      </div>

      {/* ── Top Navbar ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
        {/* Logo + Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/logo.png" alt="ProxaScreen" className="h-9 w-9 sm:h-12 sm:w-12 object-contain" />
          <span className="text-2xl sm:text-3xl tracking-tight text-white">
            <span className="font-light">Proxa</span>
            <span className="font-bold">Screen</span>
          </span>
        </div>

        {/* Login button */}
        <Link
          to="/sign-in"
          className="rounded-xl border-2 border-[#5FB0E3] bg-[#5FB0E3]/20 px-5 py-2.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-[#5FB0E3]/40 hover:border-[#5FB0E3] focus:outline-none focus:ring-2 focus:ring-[#5FB0E3]/60 sm:px-7 sm:py-3 sm:text-lg"
        >
          Login
        </Link>
      </header>

      {/* ── Centered hero content ─────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6">

        {/* Badge / pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm sm:mb-8 sm:px-4">
          <ShieldIcon className="h-3 w-3 shrink-0 text-[#5FB0E3] sm:h-3.5 sm:w-3.5" />
          <span className="text-[10px] font-medium text-white/80 tracking-wide sm:text-xs">
            AI-Powered Prostate Cancer Risk Screening
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mb-5 font-bold text-white leading-[1.05] tracking-tight sm:mb-6"
          style={{ fontSize: 'clamp(2.8rem, 10vw, 7rem)' }}
        >
          Assess.<br />
          <span
            className="inline-block"
            style={{
              opacity:    fading ? 0 : 1,
              transition: fading ? 'opacity 0.7s ease-out' : 'none',
            }}
          >
            {typed}<span style={{ opacity: showCursor ? 1 : 0 }} className="text-[#5FB0E3]">|</span>
          </span><br />
          Protect.
        </h1>

        {/* Subtitle */}
        <p
          className="mb-8 max-w-sm px-2 text-white/60 leading-relaxed sm:mb-10 sm:max-w-md sm:px-0"
          style={{ fontSize: 'clamp(0.88rem, 2vw, 1.1rem)' }}
        >
          Real-time prostate cancer risk prediction and clinical decision
          support for healthcare professionals.
        </p>

        {/* CTA button */}
        <Link
          to="/sign-in"
          className="group inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#5FB0E3]/50 sm:px-9 sm:py-4 sm:text-base"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(95,176,227,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        >
          Get Access
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </main>

      {/* ── Bottom SSL badge ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pb-5 text-[10px] text-white/30 sm:pb-6 sm:text-xs">
        <LockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
