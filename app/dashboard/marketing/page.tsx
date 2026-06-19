'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Link2, Share2, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAgentStore } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function MarketingPage() {
  const [storeSlug, setStoreSlug] = useState('')
  const [brandName, setBrandName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setError('Please login again')
        setLoading(false)
        return
      }

      try {
        const [store, profileResult] = await Promise.all([
          fetchAgentStore(userId),
          supabase.client.from('profiles').select('referral_code,full_name').eq('id', userId).maybeSingle(),
        ])

        if (store?.slug) setStoreSlug(store.slug)
        if (store?.brand_name) setBrandName(store.brand_name)
        if (profileResult.data?.referral_code) setReferralCode(profileResult.data.referral_code)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load marketing data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const storeUrl = useMemo(() => {
    if (!storeSlug || typeof window === 'undefined') return ''
    return `${window.location.origin}/store/${storeSlug}`
  }, [storeSlug])

  const referralUrl = useMemo(() => {
    if (!referralCode || typeof window === 'undefined') return ''
    return `${window.location.origin}/agent/auth?ref=${referralCode}`
  }, [referralCode])

  const shareTexts = useMemo(
    () => ({
      store: `Buy affordable data bundles from ${brandName || 'my store'} on FlashData GH! ${storeUrl}`,
      referral: `Join FlashData GH as an agent and start selling data bundles. Use my referral code: ${referralCode} — ${referralUrl}`,
      whatsapp: `Hi! Get instant MTN, Airtel-Tigo & Telecel data bundles here: ${storeUrl || 'Set up your store first'}`,
    }),
    [brandName, storeUrl, referralCode, referralUrl]
  )

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) {
      toast.error(`${label} not available yet`)
      return
    }
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Marketing Tools" description="Promote your store and grow your network.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Marketing Tools"
      description="Copy links and share-ready messages to promote your store and referral program."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Store Link" description="Share with customers to buy directly from your shop.">
          <div className="space-y-3">
            <Label>Public store URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={storeUrl || 'Set up store slug in Store Settings'} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void copyText(storeUrl, 'Store link')}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void copyText(shareTexts.store, 'Store message')}
            >
              <Link2 className="h-4 w-4" />
              Copy store promo text
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Referral Link" description={`Code: ${referralCode || '—'}`}>
          <div className="space-y-3">
            <Label>Agent signup link</Label>
            <div className="flex gap-2">
              <Input readOnly value={referralUrl || 'Referral code loading...'} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => void copyText(referralUrl, 'Referral link')}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void copyText(shareTexts.referral, 'Referral message')}
            >
              <Share2 className="h-4 w-4" />
              Copy referral promo text
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="WhatsApp Share Block"
          description="Paste into WhatsApp status or broadcast."
          className="lg:col-span-2"
        >
          <Textarea readOnly rows={4} value={shareTexts.whatsapp} className="text-sm" />
          <Button
            className="mt-3 gap-2 bg-amber-400 text-black hover:bg-amber-300"
            onClick={() => void copyText(shareTexts.whatsapp, 'WhatsApp message')}
          >
            <Megaphone className="h-4 w-4" />
            Copy WhatsApp Message
          </Button>
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
