export function PlannerBackdrop() {
  const columns = [
    {
      title: 'Todo',
      cards: [
        'Polish guest export flow',
        'Tighten modal copy',
        'Validate import edge cases',
      ],
    },
    {
      title: 'In Progress',
      cards: [
        'Run board interaction checks',
        'Review instruction routing',
      ],
    },
    {
      title: 'Done',
      cards: [
        'Ship drag reorder persistence',
        'Deploy bridge improvements',
      ],
    },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_48%)]" />
      <div className="absolute inset-0 px-4 py-8 md:px-10 md:py-10">
        <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 gap-4 opacity-90 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="rounded-2xl border border-slate-300/80 bg-slate-50/85 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {column.title}
              </div>
              <div className="mt-3 space-y-2">
                {column.cards.map((card) => (
                  <div
                    key={card}
                    className="rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-700"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-slate-100/15 backdrop-blur-[2px]" />
    </div>
  )
}
