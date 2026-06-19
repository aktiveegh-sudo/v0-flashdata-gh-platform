'use client'

import { useMemo, useState } from 'react'
import { Copy, Share2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export function ReferralCard() {
  const { user } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined' || !user?.id) return ''
    return `${window.location.origin}/agent/auth?ref=${user.id.slice(0, 8).toUpperCase()}`
  }, [user?.id])

  const copyLink = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied')
    window.setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (!referralLink) return
    if (navigator.share) {
      await navigator.share({
        title: 'Join FlashData GH',
        text: 'Sign up and buy your first data bundle on FlashData GH.',
        url: referralLink,
      })
      return
    }
    void copyLink()
  }

  return (
    <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
          <Share2 className="h-4 w-4 text-amber-500" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-white/60">
          Share your link and earn when friends join and buy their first bundle.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={referralLink} className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={() => void copyLink()} className="shrink-0">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/65">
            <Users className="h-4 w-4 text-amber-500" />
            Friends Joined
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">0</span>
        </div>
        <Button onClick={() => void shareLink()} className="w-full rounded-full bg-amber-400 text-black hover:bg-amber-300">
          Share Referral Link
        </Button>
      </CardContent>
    </Card>
  )
}
