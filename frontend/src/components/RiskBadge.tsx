import type { RiskLevel } from '../types'

interface Props {
  level: RiskLevel | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

const CONFIG: Record<RiskLevel, { label: string; className: string; dot: string }> = {
  Low:    { label: 'Low Risk',    className: 'bg-green-50  text-green-700  ring-green-200',  dot: 'bg-green-500'  },
  Medium: { label: 'Medium Risk', className: 'bg-yellow-50 text-yellow-700 ring-yellow-200', dot: 'bg-yellow-500' },
  High:   { label: 'High Risk',   className: 'bg-red-50    text-red-700    ring-red-200',    dot: 'bg-red-500'    },
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
}

export default function RiskBadge({ level, size = 'md' }: Props) {
  if (!level) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset bg-gray-50 text-gray-400 ring-gray-200 ${SIZE[size]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        No assessment
      </span>
    )
  }

  const { label, className, dot } = CONFIG[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${className} ${SIZE[size]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
