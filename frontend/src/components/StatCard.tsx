interface Props {
  title:   string
  value:   number | string
  icon:    React.ReactNode
  accent?: 'primary' | 'secondary' | 'red' | 'green'
  loading?: boolean
}

const ACCENT = {
  primary:   { bg: 'bg-primary/10',   icon: 'text-primary',   border: 'border-primary/20' },
  secondary: { bg: 'bg-secondary/10', icon: 'text-secondary', border: 'border-secondary/20' },
  red:       { bg: 'bg-red-50',       icon: 'text-red-500',   border: 'border-red-100' },
  green:     { bg: 'bg-green-50',     icon: 'text-green-600', border: 'border-green-100' },
}

export default function StatCard({ title, value, icon, accent = 'primary', loading = false }: Props) {
  const { bg, icon: iconColor, border } = ACCENT[accent]
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 border ${border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
