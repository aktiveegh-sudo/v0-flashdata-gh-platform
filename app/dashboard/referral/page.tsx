'use client'

import { ReferralCard } from '@/components/dashboard/referral-card'

export default function ReferralPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white lg:text-3xl">Refer & Earn</h1>
        <p className="mt-1 text-sm text-slate-400">Invite friends and earn when they join and buy data on FlashData GH.</p>
      </div>
      <ReferralCard />
    </div>
  )
}
