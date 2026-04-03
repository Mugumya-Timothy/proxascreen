import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import { useClinicianStats } from '../../hooks/useDashboard'
import AddPatientModal from '../../components/AddPatientModal'

export default function DashboardPage() {
  const { user } = useUser()
  const firstName = user?.firstName ?? 'there'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [showAddPatient, setShowAddPatient] = useState(false)

  const { data: stats, isLoading, isError } = useClinicianStats()

  const total      = stats?.total_patients    ?? 0
  const highRisk   = stats?.high_risk_count   ?? 0
  const lowRisk    = stats?.low_risk_count    ?? 0
  const mediumRisk = Math.max(0, total - highRisk - lowRisk)

  const highPct   = total > 0 ? Math.round((highRisk   / total) * 100) : 0
  const lowPct    = total > 0 ? Math.round((lowRisk    / total) * 100) : 0
  const mediumPct = total > 0 ? Math.round((mediumRisk / total) * 100) : 0

  const assessmentsPerPatient =
    total > 0 && (stats?.total_assessments ?? 0) > 0
      ? ((stats?.total_assessments ?? 0) / total).toFixed(1)
      : '—'

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's a summary of your patient assessments and risk activity.
          </p>
          <p className="mt-1 text-xs text-gray-400">{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button onClick={() => setShowAddPatient(true)} className="btn-primary text-xs px-3 py-1.5">
            + Add Patient
          </button>
          <Link to="/patients" className="btn-outline text-xs px-3 py-1.5">
            View Patients
          </Link>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Failed to load dashboard stats. Please refresh the page.</span>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats?.total_patients ?? 0}
          accent="primary"
          loading={isLoading}
          subtitle="Under your care"
          icon={<PatientsIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Total Assessments"
          value={stats?.total_assessments ?? 0}
          accent="secondary"
          loading={isLoading}
          subtitle="Screenings completed"
          icon={<AssessmentsIcon className="h-5 w-5" />}
        />
        <StatCard
          title="High Risk Cases"
          value={stats?.high_risk_count ?? 0}
          accent="red"
          loading={isLoading}
          subtitle="Require urgent review"
          icon={<HighRiskIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Low Risk Cases"
          value={stats?.low_risk_count ?? 0}
          accent="green"
          loading={isLoading}
          subtitle="Within safe range"
          icon={<LowRiskIcon className="h-5 w-5" />}
        />
      </div>

      {/* ── Secondary panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Risk Distribution — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 border border-gray-100">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Patient Risk Distribution</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Breakdown of your patients by current risk level
              </p>
            </div>
            <Link
              to="/patients"
              className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
            >
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* High risk */}
                <RiskBar
                  label="High Risk"
                  count={highRisk}
                  pct={highPct}
                  dotColor="bg-red-500"
                  barColor="bg-red-400"
                />
                {/* Medium risk */}
                <RiskBar
                  label="Medium Risk"
                  count={mediumRisk}
                  pct={mediumPct}
                  dotColor="bg-yellow-400"
                  barColor="bg-yellow-400"
                />
                {/* Low risk */}
                <RiskBar
                  label="Low Risk"
                  count={lowRisk}
                  pct={lowPct}
                  dotColor="bg-secondary"
                  barColor="bg-secondary"
                />
              </div>

              {/* Compact multi-colour stacked bar */}
              {total > 0 && (
                <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-red-400 transition-all duration-700"
                    style={{ width: `${highPct}%` }}
                    title={`High: ${highPct}%`}
                  />
                  <div
                    className="bg-yellow-400 transition-all duration-700"
                    style={{ width: `${mediumPct}%` }}
                    title={`Medium: ${mediumPct}%`}
                  />
                  <div
                    className="bg-secondary transition-all duration-700"
                    style={{ width: `${lowPct}%` }}
                    title={`Low: ${lowPct}%`}
                  />
                  {/* remaining (un-assessed) */}
                  <div className="flex-1 bg-gray-100" />
                </div>
              )}

              {/* Summary row */}
              <div className="mt-6 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 py-4">
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-gray-900">{total.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Total Patients</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-primary">
                    {(stats?.total_assessments ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Assessments</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-gray-700">{assessmentsPerPatient}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Avg per Patient</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick actions — 1/3 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 border border-gray-100">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Quick Actions</h2>
          <div className="space-y-2.5">
            <QuickAction
              onClick={() => setShowAddPatient(true)}
              icon={<AddPatientIcon className="h-4 w-4" />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              cardBg="bg-primary/5 hover:bg-primary/10 border-primary/20"
              title="Add Patient"
              desc="Register a new patient"
            />
            <QuickAction
              to="/patients"
              icon={<PatientsIcon className="h-4 w-4" />}
              iconBg="bg-secondary/10"
              iconColor="text-secondary"
              cardBg="bg-secondary/5 hover:bg-secondary/10 border-secondary/20"
              title="View All Patients"
              desc="Browse your patient list"
            />
            <QuickAction
              to="/patients"
              icon={<HighRiskIcon className="h-4 w-4" />}
              iconBg="bg-red-50"
              iconColor="text-red-500"
              cardBg="bg-red-50/60 hover:bg-red-50 border-red-100"
              title="High Risk Patients"
              desc={`${highRisk} patient${highRisk !== 1 ? 's' : ''} need attention`}
            />
          </div>

          {/* At-a-glance risk legend */}
          {!isLoading && total > 0 && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Risk Legend
              </p>
              <div className="space-y-2">
                <LegendRow dot="bg-red-400"    label="High Risk"   count={highRisk}   />
                <LegendRow dot="bg-yellow-400" label="Medium Risk" count={mediumRisk} />
                <LegendRow dot="bg-secondary"  label="Low Risk"    count={lowRisk}    />
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddPatient && (
        <AddPatientModal onClose={() => setShowAddPatient(false)} />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBar({
  label, count, pct, dotColor, barColor,
}: {
  label: string; count: number; pct: number; dotColor: string; barColor: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {count.toLocaleString()}
          <span className="ml-1 text-xs font-normal text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function LegendRow({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className="text-xs font-semibold text-gray-900">{count.toLocaleString()}</span>
    </div>
  )
}

function QuickAction({
  to, onClick, icon, iconBg, iconColor, cardBg, title, desc,
}: {
  to?: string; onClick?: () => void; icon: React.ReactNode; iconBg: string; iconColor: string;
  cardBg: string; title: string; desc: string
}) {
  const inner = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight">{title}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-colors ${cardBg}`}
      >
        {inner}
      </button>
    )
  }
  return (
    <Link
      to={to!}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${cardBg}`}
    >
      {inner}
    </Link>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function LowRiskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AddPatientIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}
