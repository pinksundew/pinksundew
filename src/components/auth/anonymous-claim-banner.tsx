'use client'

import { ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ClaimAccountModal } from './claim-account-modal'

type AnonymousClaimBannerProps = {
  anonymousUserId: string
}

export function AnonymousClaimBanner({ anonymousUserId }: AnonymousClaimBannerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 shadow-sm">
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          Guest mode
        </span>
        <span className="hidden text-amber-700/80 sm:inline">·</span>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Save your board
        </button>
      </div>

      <ClaimAccountModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anonymousUserId={anonymousUserId}
      />
    </>
  )
}
