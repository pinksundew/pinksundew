import type { Metadata } from 'next'
import { GuestBootstrapPage } from '@/components/guest/guest-bootstrap-page'

export const metadata: Metadata = {
  title: 'Guest Board',
}

export const dynamic = 'force-dynamic'

export default function GuestBoardPage() {
  return <GuestBootstrapPage />
}
