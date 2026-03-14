const TYPE_MAP = {
  pdf: { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-600',   label: 'PDF' },
  doc: { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600',   label: 'DOC' },
  img: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', label: 'IMG' },
}

export default function FileChip({ type }) {
  const t = TYPE_MAP[type] || TYPE_MAP.doc
  return (
    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${t.bg} ${t.border}`}>
      <span className={t.text}>{t.label}</span>
    </div>
  )
}
