import { useServicesHealth } from '../hooks/useDashboard'

type Dot = 'online' | 'offline' | 'loading'

function StatusDot({ state }: { state: Dot }) {
  if (state === 'loading') {
    return (
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-300 animate-pulse" />
    )
  }
  if (state === 'online') {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60 [animation-duration:2s]" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
      </span>
    )
  }
  return <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
}

function ServiceRow({
  label,
  state,
  latency,
}: {
  label: string
  state: Dot
  latency?: number
}) {
  const badge =
    state === 'loading'
      ? { text: 'Checking…', cls: 'bg-gray-100 text-gray-500' }
      : state === 'online'
      ? { text: 'Online', cls: 'bg-secondary/10 text-secondary' }
      : { text: 'Offline', cls: 'bg-red-50 text-red-600' }

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusDot state={state} />
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {state === 'online' && typeof latency === 'number' && (
          <span className="text-xs text-gray-400">{latency} ms</span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
    </div>
  )
}

export default function ServiceStatusPanel() {
  const { data, isLoading, isError, dataUpdatedAt } = useServicesHealth()

  const apiState: Dot    = isLoading ? 'loading' : isError ? 'offline' : (data?.api.status ?? 'offline')
  const modelState: Dot  = isLoading ? 'loading' : isError ? 'offline' : (data?.model_service.status ?? 'offline')

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 border border-gray-100">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PulseIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-gray-900">Service Health</h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">Live system status · refreshes every 15 s</p>
        </div>
        {lastChecked && (
          <span className="text-xs text-gray-400">
            Last checked {lastChecked}
          </span>
        )}
      </div>

      {/* Service rows */}
      <div className="space-y-2.5">
        <ServiceRow
          label="API Server"
          state={apiState}
          latency={data?.api.latency_ms}
        />
        <ServiceRow
          label="Model Service"
          state={modelState}
          latency={data?.model_service.latency_ms}
        />
      </div>

      {/* Error note */}
      {isError && (
        <p className="mt-3 text-xs text-red-500">
          Could not reach the health endpoint. The API may be unreachable.
        </p>
      )}
    </div>
  )
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 12h3l3-9 3 18 3-9h3m3 0h.01" />
    </svg>
  )
}
