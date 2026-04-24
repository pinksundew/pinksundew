'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bot, CircleDot, PlugZap } from 'lucide-react'

function FlowPacket({ delay }: { delay: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-pink-500/90 shadow-sm shadow-pink-300/50"
      initial={{ left: '6%', opacity: 0 }}
      animate={{ left: ['6%', '94%'], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', delay }}
      aria-hidden
    />
  )
}

function Connector({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[2.25rem] flex-1 items-center justify-center px-0.5">
      <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-pink-400/70" />
      {children}
    </div>
  )
}

export function McpFlowGraphic() {
  return (
    <div className="w-full rounded-xl border border-pink-100/55 bg-gradient-to-b from-pink-50/35 via-white to-slate-50/40 p-2.5 shadow-sm ring-1 ring-slate-100/60 sm:p-3">
      <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        How it works
      </p>

      <div className="flex items-stretch gap-1 sm:gap-1.5">
        {/* Board */}
        <div className="flex w-[34%] min-w-0 shrink-0 flex-col rounded-lg border border-slate-200/85 bg-white p-2 shadow-sm">
          <p className="mb-1.5 text-[8px] font-black uppercase tracking-wide text-slate-400">Your board</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded border border-slate-100 bg-slate-50/90 px-1 py-1">
              <p className="mb-1 text-[7px] font-bold uppercase text-slate-400">To do</p>
              <div className="space-y-1">
                <div className="flex items-center gap-0.5">
                  <CircleDot className="h-1.5 w-1.5 shrink-0 text-pink-600" aria-hidden />
                  <span className="h-0.5 flex-1 rounded-full bg-slate-200" />
                </div>
                <div className="flex items-center gap-0.5">
                  <CircleDot className="h-1.5 w-1.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="h-0.5 flex-1 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
            <div className="rounded border border-amber-100/90 bg-amber-50/60 px-1 py-1">
              <p className="mb-1 text-[7px] font-bold uppercase text-amber-700/90">In progress</p>
              <div className="flex items-center gap-0.5">
                <CircleDot className="h-1.5 w-1.5 shrink-0 text-amber-600" aria-hidden />
                <span className="h-0.5 flex-1 rounded-full bg-amber-200/90" />
              </div>
            </div>
          </div>
        </div>

        {/* Board → link */}
        <Connector>
          <FlowPacket delay={0} />
          <FlowPacket delay={0.8} />
          <FlowPacket delay={1.6} />
        </Connector>

        {/* Hub — technical name only for assistive tech */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
          <motion.span
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200/80 bg-white text-pink-700 shadow-md ring-2 ring-pink-100/50"
            animate={{ scale: [1, 1.04, 1], boxShadow: ['0 1px 2px rgb(0 0 0 / 0.04)', '0 4px 14px rgb(244 114 182 / 0.25)', '0 1px 2px rgb(0 0 0 / 0.04)'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            title="Secure connection (MCP)"
          >
            <PlugZap className="h-4 w-4" aria-hidden />
          </motion.span>
          <span className="sr-only">Secure connection via MCP</span>
          <span className="text-center text-[8px] font-bold leading-tight text-slate-600">Live link</span>
        </div>

        {/* Link → agent */}
        <Connector>
          <FlowPacket delay={0.3} />
          <FlowPacket delay={1.1} />
          <FlowPacket delay={1.9} />
        </Connector>

        {/* Agent */}
        <div className="flex w-[30%] min-w-0 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200/85 bg-white p-2 text-center shadow-sm">
          <div className="relative">
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-400/35 blur-[6px]"
              animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.05, 0.92] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-inner">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <p className="mt-1.5 text-[8px] font-black uppercase tracking-wide text-slate-600">Your agent</p>
          <div className="mt-1 inline-flex items-center gap-0.5 text-[7px] font-semibold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Ready
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-balance text-center text-[9px] font-medium leading-snug text-slate-500">
        Your agent picks up what’s on the board and saves progress back—nothing gets lost in chat.
      </p>
    </div>
  )
}
