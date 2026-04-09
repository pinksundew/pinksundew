import type { Metadata } from 'next'
import { GuestBoardShell } from '@/components/guest/guest-board-shell'

export const metadata: Metadata = {
  title: 'Guest Board',
}

export default function GuestBoardPage() {
  return <GuestBoardShell />
}
