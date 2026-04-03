interface Props {
  title:     string
  value:     number | string
  icon:      React.ReactNode
  accent?:   'primary' | 'secondary' | 'red' | 'green'
  loading?:  boolean
  subtitle?: string
}

const ACCENT = {
  primary:   { bg: 'bg-primary/10',   icon: 'text-primary',   border: 'border-primary/20',   bar: 'bg-primary' },
  secondary: { bg: 'bg-secondary/10', icon: 'text-secondary', border: 'border-secondary/20', bar: 'bg-secondary' },
  red:       { bg: 'bg-red-50',       icon: 'text-red-500',   border: 'border-red-100',       bar: 'bg-red-400' },
  green:     { bg: 'bg-green-50',     icon: 'text-green-600', border: 'border-green-100',     bar: 'bg-green-500' },
}

export default function StatCard({
  title, value, icon, accent = 'primary', loading = false, subtitle,
}: Props) {
  const { bg, icon: iconColor, border } = ACCENT[accent]

  return (
    <div className={`group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 border ${border} hover:shadow-md transition-shadow duration-200`}>
      {/* Icon + title row */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${iconColor}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100" />
          <div className="h-3 w-28 animate-pulse rounded-md bg-gray-100" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
        </>
      )}
    </div>
  )
}
