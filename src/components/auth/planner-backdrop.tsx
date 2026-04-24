export function PlannerBackdrop() {
  const previewColumns = [
    ['Draft onboarding copy', 'Verify merge redirect', 'Refine auth empty state'],
    ['Investigate anonymous flow', 'Tighten custom docs UI'],
    ['Ship profile polish', 'Review claim callback', 'Confirm board state'],
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fdf2f8_0%,#f8fafc_42%,#eef2ff_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[78vh] w-[min(1100px,96vw)] -translate-x-1/2 -translate-y-1/2 scale-[1.02] opacity-80">
        <div className="grid h-full grid-cols-3 gap-5 rounded-[2rem] border border-white/70 bg-white/35 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.08)]">
          {previewColumns.map((cards, columnIndex) => (
            <div
              key={columnIndex}
              className="flex flex-col rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-2.5 w-24 rounded-full bg-slate-200/90" />
                <div className="h-8 w-8 rounded-full bg-pink-100/90" />
              </div>
              <div className="space-y-3">
                {cards.map((card) => (
                  <div
                    key={card}
                    className="rounded-2xl border border-pink-100/80 bg-white/90 p-3 shadow-[0_12px_30px_rgba(236,72,153,0.08)]"
                  >
                    <div className="h-2 w-20 rounded-full bg-pink-200/80" />
                    <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-200/90" />
                    <div className="mt-2 h-3 w-3/5 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-slate-100/45 backdrop-blur-md" />
    </div>
  )
}
