import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import ServiceStatusPanel from '../../components/ServiceStatusPanel'
import { useAdminStats } from '../../hooks/useDashboard'
import AddPatientModal from '../../components/AddPatientModal'
import AddClinicianModal from '../../components/AddClinicianModal'
import AdminAboutTab from './AdminAboutTab'

export default function DashboardPage() {
  const { user } = useUser()
  const firstName = user?.firstName ?? 'Admin'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [showAddPatient,    setShowAddPatient]    = useState(false)
  const [showAddClinician,  setShowAddClinician]  = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'about'>('overview')

  const { data: stats, isLoading, isError } = useAdminStats()

  const total    = stats?.total_assessments ?? 0
  const highRisk = stats?.total_high_risk   ?? 0
  const highPct  = total > 0 ? Math.round((highRisk / total) * 100) : 0
  const safePct  = total > 0 ? 100 - highPct : 0

  return (
    <div className="space-y-6">

      {/* ── Hero welcome banner ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-6 sm:px-8 sm:py-7"
        style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 55%, #1e6a96 100%)' }}
      >
        {/* Decorative blobs */}
        <span
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-[0.08]"
          style={{ background: '#5FB0E3' }}
        />
        <span
          className="pointer-events-none absolute -bottom-4 right-16 h-28 w-28 rounded-full opacity-[0.06]"
          style={{ background: '#58C697' }}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
              <CalendarIcon className="h-3 w-3" />
              {today}
            </p>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-white/55">
              View an overview of essential metrics and system-wide updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <button
              onClick={() => setShowAddClinician(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Clinician
            </button>
            <button
              onClick={() => setShowAddPatient(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white/75 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Patient
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Failed to load dashboard stats. Please refresh the page.</span>
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 self-start rounded-xl bg-gray-100 p-1">
        {(['overview', 'about'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'About & AI Model'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
      <div className="space-y-6">

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Clinicians"
          value={stats?.total_clinicians ?? 0}
          accent="secondary"
          loading={isLoading}
          subtitle="Active medical staff"
          icon={<CliniciansIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Total Patients"
          value={stats?.total_patients ?? 0}
          accent="primary"
          loading={isLoading}
          subtitle="Registered in system"
          icon={<PatientsIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Total Assessments"
          value={stats?.total_assessments ?? 0}
          accent="primary"
          loading={isLoading}
          subtitle="Completed screenings"
          icon={<AssessmentsIcon className="h-5 w-5" />}
        />
        <StatCard
          title="High Risk Cases"
          value={stats?.total_high_risk ?? 0}
          accent="red"
          loading={isLoading}
          subtitle="Require urgent review"
          icon={<HighRiskIcon className="h-5 w-5" />}
        />
      </div>

      {/* ── Service Health (admin only) ────────────────────────────────────── */}
      <ServiceStatusPanel />

      {/* ── Secondary panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Risk Screening Overview — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Risk Screening Overview</h2>
              <p className="mt-0.5 text-xs text-gray-400">Platform-wide assessment risk distribution</p>
            </div>
            <Link
              to="/admin/patients"
              className="text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
            >
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-5">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded-md bg-gray-100" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {/* High risk */}
                <RiskBar
                  label="High Risk"
                  count={highRisk}
                  pct={highPct}
                  dotColor="bg-red-500"
                  barColor="bg-red-400"
                />
                {/* Lower risk */}
                <RiskBar
                  label="Lower Risk"
                  count={total - highRisk}
                  pct={safePct}
                  dotColor="bg-secondary"
                  barColor="bg-secondary"
                />
              </div>

              {/* Summary row */}
              <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-gray-100">
                <div className="bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats?.total_patients ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Patients</p>
                </div>
                <div className="bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {total.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Assessments</p>
                </div>
                <div className="bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {highRisk.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">High Risk</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions — 1/3 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold text-gray-900">Quick Actions</h2>
          <div className="space-y-2.5">
            <QuickAction
              onClick={() => setShowAddClinician(true)}
              icon={<CliniciansIcon className="h-4 w-4" />}
              iconBg="bg-secondary/10"
              iconColor="text-secondary"
              cardBg="hover:bg-secondary/5 border-gray-100 hover:border-secondary/20"
              title="Add Clinician"
              desc="Register new medical staff"
            />
            <QuickAction
              onClick={() => setShowAddPatient(true)}
              icon={<PatientsIcon className="h-4 w-4" />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              cardBg="hover:bg-primary/5 border-gray-100 hover:border-primary/20"
              title="Add Patient"
              desc="Register a new patient"
            />
            <QuickAction
              to="/admin/patients"
              icon={<AssessmentsIcon className="h-4 w-4" />}
              iconBg="bg-gray-100"
              iconColor="text-gray-500"
              cardBg="hover:bg-gray-50 border-gray-100"
              title="View Patients"
              desc="Browse all patient records"
            />
            <QuickAction
              to="/admin/clinicians"
              icon={<CliniciansIcon className="h-4 w-4" />}
              iconBg="bg-gray-100"
              iconColor="text-gray-500"
              cardBg="hover:bg-gray-50 border-gray-100"
              title="View Clinicians"
              desc="Manage medical staff"
            />
          </div>
        </div>
      </div>

      </div>
      ) : (
        <AdminAboutTab />
      )}

      {showAddPatient && (
        <AddPatientModal base="/admin" onClose={() => setShowAddPatient(false)} />
      )}
      {showAddClinician && (
        <AddClinicianModal onClose={() => setShowAddClinician(false)} />
      )}
    </div>
  )
}

// ── Risk bar ──────────────────────────────────────────────────────────────────

function RiskBar({
  label, count, pct, dotColor, barColor,
}: {
  label: string; count: number; pct: number; dotColor: string; barColor: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {count.toLocaleString()}
          <span className="ml-1.5 text-xs font-normal text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Quick action card ──────────────────────────────────────────────────────────

function QuickAction({
  to, onClick, icon, iconBg, iconColor, cardBg, title, desc,
}: {
  to?: string; onClick?: () => void; icon: React.ReactNode
  iconBg: string; iconColor: string; cardBg: string; title: string; desc: string
}) {
  const inner = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{desc}</p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
    </>
  )
  const cls = `flex w-full items-center gap-3 rounded-xl border p-3 transition-colors ${cardBg}`
  if (onClick) {
    return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  }
  return <Link to={to!} className={cls}>{inner}</Link>
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function CliniciansIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function PatientsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function AssessmentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function HighRiskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}
