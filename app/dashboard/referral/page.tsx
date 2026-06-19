'use client'

import { ReferralCard } from '@/components/dashboard/referral-card'
import { DashboardPageShell } from '@/components/dashboard/page-shell'

export default function ReferralPage() {
  return (
    <DashboardPageShell
      title="Refer & Earn"
      description="Invite friends and earn when they join and buy data on FlashData GH."
      className="mx-auto max-w-3xl"
    >
      <ReferralCard />
    </DashboardPageShell>
  )
}
