import { Link } from 'react-router-dom'

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotFoundPage() {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: 'linear-gradient(135deg, #f0f9fe 0%, #f8fffe 55%, #f0fdf8 100%)' }}
    >
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="nfgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#5FB0E3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#nfgrid)" />
        </svg>
        <div className="absolute -top-56 -right-56 h-[560px] w-[560px] rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-56 -left-56 h-[560px] w-[560px] rounded-full bg-secondary/10 blur-[90px]" />
      </div>

      {/* Card */}
      <div
        className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl bg-white px-10 py-12 text-center"
        style={{
          boxShadow: '0 8px 40px 0 rgba(87,190,235,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.06)',
          border: '1px solid rgba(87,190,235,0.13)',
        }}
      >
        {/* Logo */}
        <img src="/logo.png" alt="ProxaScreen logo" width={48} height={48} className="mb-4" />

        {/* 404 number */}
        <div
          className="mb-1 text-7xl font-bold leading-none tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #5FB0E3 0%, #2aa8dd 60%, #3dbf8a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </div>

        {/* Divider */}
        <div
          className="my-5 h-px w-12"
          style={{ background: 'linear-gradient(90deg, transparent, #5FB0E355, transparent)' }}
        />

        {/* Heading */}
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-gray-900">
          Page not found
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-400">
          The page you're looking for doesn't exist or has been moved.
          <br />
          Head back to a safe place below.
        </p>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <Link
            to="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={{
              background: 'linear-gradient(135deg, #5FB0E3 0%, #2aa8dd 100%)',
              boxShadow: '0 4px 14px 0 rgba(87,190,235,0.30)',
            }}
          >
            <HomeIcon className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <Link
            to="/sign-in"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="relative z-10 mt-6 flex items-center gap-1.5 text-xs text-gray-300">
        <ShieldIcon className="h-3.5 w-3.5" />
        <span>256-bit SSL encrypted · ProxaScreen</span>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
