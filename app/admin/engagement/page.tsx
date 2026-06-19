'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Megaphone, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchSiteSettingsAdmin } from '@/lib/admin/admin-pages-data'
import { supabase } from '@/lib/supabase/client'
import { ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

export default function AdminEngagementPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState(1)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [rewardedCount, setRewardedCount] = useState(0)
  const [totalRewards, setTotalRewards] = useState(0)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [activeStreaks, setActiveStreaks] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [settings, referralsRes, profilesRes] = await Promise.all([
        fetchSiteSettingsAdmin(),
        supabase.client.from('referrals').select('id,status,reward_amount'),
        supabase.client.from('profiles').select('loyalty_points,streak_count'),
      ])

      setSettingsId(Number(settings.id) || 1)
      setShowAnnouncement(!!settings.show_announcement)

      const referrals = referralsRes.data || []
      setReferralCount(referrals.length)
      setRewardedCount(referrals.filter((r) => r.status === 'rewarded').length)
      setTotalRewards(referrals.reduce((s, r) => s + Number(r.reward_amount || 0), 0))

      const profiles = profilesRes.data || []
      setLoyaltyPoints(profiles.reduce((s, p) => s + Number(p.loyalty_points || 0), 0))
      setActiveStreaks(profiles.filter((p) => Number(p.streak_count || 0) > 0).length)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load engagement data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleAnnouncement = async (value: boolean) => {
    setSaving(true)
    setShowAnnouncement(value)
    const { error } = await supabase.client
      .from('site_settings')
      .update({ show_announcement: value, updated_at: new Date().toISOString() })
      .eq('id', settingsId)
    if (error) {
      toast.error(error.message)
      setShowAnnouncement(!value)
    } else {
      toast.success(value ? 'Announcements enabled' : 'Announcements disabled')
    }
    setSaving(false)
  }

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Engagement Hub"
      description="Referrals, loyalty rewards, and announcement controls."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Referrals" value={String(referralCount)} icon={Users} />
          <AdminStatCard label="Rewarded" value={String(rewardedCount)} icon={Gift} />
          <AdminStatCard label="Rewards Paid" value={ghanaCurrency(totalRewards)} />
          <AdminStatCard label="Loyalty Points" value={loyaltyPoints.toLocaleString()} hint={`${activeStreaks} users with streaks`} />
        </AdminStatGrid>
      }
    >
      <AdminPanel title="Announcements" description="Control site-wide engagement banners">
        <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-white/5">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Show Announcements</p>
              <p className="text-sm text-gray-500 dark:text-white/50">
                When enabled, users see the promo banner on their dashboard.
              </p>
            </div>
          </div>
          <Switch checked={showAnnouncement} onCheckedChange={toggleAnnouncement} disabled={saving} />
        </div>
      </AdminPanel>

      <AdminPanel title="Loyalty Overview">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Points Issued', value: loyaltyPoints.toLocaleString() },
            { label: 'Users with Streaks', value: String(activeStreaks) },
            { label: 'Referral Conversion', value: referralCount ? `${Math.round((rewardedCount / referralCount) * 100)}%` : '0%' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">{item.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}
