const COLOR_MAP = {
  'Alice Johnson': 'bg-indigo-100 text-indigo-700',
  'Bob Chen':      'bg-amber-100 text-amber-700',
  'Cathy Park':    'bg-emerald-100 text-emerald-700',
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
}

export default function Avatar({ name, size = 'sm' }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const colors = COLOR_MAP[name] || 'bg-slate-100 text-slate-600'
  const sz = SIZE_MAP[size] || SIZE_MAP.sm

  return (
    <div className={`${sz} ${colors} rounded-full font-semibold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}
