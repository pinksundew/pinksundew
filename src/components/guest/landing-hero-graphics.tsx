'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CLIENT_LOGOS } from '@/components/brand/client-logos'

const HERO_IDE_ORBIT = [
  { name: 'Cursor', Logo: CLIENT_LOGOS.cursor },
  { name: 'Codex', Logo: CLIENT_LOGOS.codex },
  { name: 'VS Code', Logo: CLIENT_LOGOS.vscode },
  { name: 'Antigravity', Logo: CLIENT_LOGOS.antigravity },
] as const

const SYNC_RULE_FILES = ['AGENTS.md', 'copilot-instructions.md', 'antigravity.md'] as const

const LOGO_WRAP_PX = 28
/** Half-width of square logo cell toward center along the radial (px). */
const LOGO_INSET_PX = LOGO_WRAP_PX / 2
/** Outer margin from logo orbit to component edge (px). */
const ORBIT_EDGE_PX = 5

export type SyncIdeOrbitProps = {
  /** Distance from center to each IDE logo (px). */
  orbitRadiusPx?: number
  className?: string
}

export function SyncIdeOrbit({ orbitRadiusPx = 60, className }: SyncIdeOrbitProps) {
  const [fileIndex, setFileIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setFileIndex((i) => (i + 1) % SYNC_RULE_FILES.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  const slots = useMemo(() => {
    const n = HERO_IDE_ORBIT.length
    return HERO_IDE_ORBIT.map((entry, i) => {
      const deg = (-90 + (360 / n) * i) * (Math.PI / 180)
      const x = Math.round(Math.cos(deg) * orbitRadiusPx * 10) / 10
      const y = Math.round(Math.sin(deg) * orbitRadiusPx * 10) / 10
      return { ...entry, x, y }
    })
  }, [orbitRadiusPx])

  const sizePx = (orbitRadiusPx + LOGO_WRAP_PX / 2 + ORBIT_EDGE_PX) * 2
  /** Conservative max width for wrapped filenames inside the ring (no box). */
  const labelMaxPx = Math.max(88, Math.round((orbitRadiusPx - LOGO_INSET_PX) * 2 * 0.9))

  return (
    <div className={className}>
      <div
        className="relative mx-auto text-slate-700"
        style={{ width: sizePx, height: sizePx }}
        aria-label="Instruction files synced to multiple IDEs"
      >
        <div
          className="pointer-events-none absolute inset-[6px] rounded-full border border-pink-100/70 bg-gradient-to-b from-white to-pink-50/35 shadow-inner ring-1 ring-slate-200/50"
          aria-hidden="true"
        />
        <div className="absolute inset-0 z-[1] flex items-center justify-center px-1">
          <div
            className="relative flex min-h-[2.35rem] items-center justify-center px-1 text-center"
            style={{ maxWidth: labelMaxPx }}
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={SYNC_RULE_FILES[fileIndex]}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.26 }}
                title={SYNC_RULE_FILES[fileIndex]}
                className="text-balance font-mono text-[8px] font-bold leading-snug text-slate-800 sm:text-[9px]"
              >
                {SYNC_RULE_FILES[fileIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        {slots.map(({ name, Logo, x, y }) => (
          <div
            key={name}
            className="absolute left-1/2 top-1/2 z-[2] flex items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-md ring-1 ring-white"
            style={{
              width: LOGO_WRAP_PX,
              height: LOGO_WRAP_PX,
              marginLeft: -LOGO_WRAP_PX / 2,
              marginTop: -LOGO_WRAP_PX / 2,
              transform: `translate(${x}px, ${y}px)`,
            }}
            title={name}
          >
            <Logo className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  )
}
