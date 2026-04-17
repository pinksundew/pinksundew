export function PlannerBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 scale-[1.02]">
        <iframe
          src="/guest"
          title="Pink Sundew guest board preview"
          className="h-full w-full border-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <div className="absolute inset-0 bg-slate-100/35 backdrop-blur-sm" />
    </div>
  )
}
