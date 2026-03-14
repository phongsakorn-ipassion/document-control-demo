const VARIANTS = {
  slate:   'bg-slate-100 text-slate-600',
  amber:   'bg-amber-100 text-amber-700',
  blue:    'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose:    'bg-rose-100 text-rose-700',
  indigo:  'bg-indigo-100 text-indigo-700',
  violet:  'bg-violet-100 text-violet-700',
}

export default function Badge({ label, color = 'slate' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[color] || VARIANTS.slate}`}>
      {label}
    </span>
  )
}
