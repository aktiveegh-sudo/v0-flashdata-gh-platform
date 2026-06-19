'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Package, ShieldCheck, Store, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAgentStore } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'

export default function SwiftVendorPage() {
  const [packageCount, setPackageCount] = useState(0)
  const [storeActive, setStoreActive] = useState(false)
  const [brandName, setBrandName] = useState('')
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
        const [store, packagesResult] = await Promise.all([
          fetchAgentStore(userId),
          supabase.client
            .from('data_packages')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
        ])

        setPackageCount(packagesResult.count || 0)
        setStoreActive(Boolean(store?.is_active))
        setBrandName(store?.brand_name || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load vendor data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const vendorStatus = useMemo(() => {
    if (storeActive && packageCount > 0) return 'Active Vendor'
    if (packageCount > 0) return 'Packages Ready'
    return 'Setup Required'
  }, [storeActive, packageCount])

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Flash Vendor" description="Your vendor hub for data sales.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Flash Vendor"
      description="Your vendor command center — buy wholesale data and manage your selling tools."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Active Packages" value={String(packageCount)} icon={Package} />
          <DashboardStatCard label="Vendor Status" value={vendorStatus} icon={ShieldCheck} />
          <DashboardStatCard label="Store" value={brandName || 'Not set'} icon={Store} />
        </DashboardStatGrid>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Quick Actions">
          <div className="grid gap-3">
            <Link href="/dashboard/buy-data">
              <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 transition-colors hover:bg-amber-400/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Buy Data</p>
                    <p className="text-xs text-gray-500 dark:text-white/45">Purchase bundles from wallet</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
              </div>
            </Link>

            <Link href="/dashboard/bulk">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-colors hover:border-amber-400/30 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
                    <Package className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Bulk Orders</p>
                    <p className="text-xs text-gray-500 dark:text-white/45">Send to multiple numbers</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>

            <Link href="/dashboard/my-store">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-colors hover:border-amber-400/30 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
                    <Store className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">My Shop</p>
                    <p className="text-xs text-gray-500 dark:text-white/45">Track store performance</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Vendor Status">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Platform Packages</p>
                <Badge className="bg-amber-400/15 text-amber-700 dark:text-amber-400">{packageCount} active</Badge>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-white/45">
                Wholesale packages available for vendor purchases across all networks.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Store Status</p>
                <Badge
                  variant="secondary"
                  className={
                    storeActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }
                >
                  {storeActive ? 'Live' : 'Inactive'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-white/45">
                {brandName ? `${brandName} is your public storefront brand.` : 'Set up your store in Store Settings.'}
              </p>
            </div>

            <Link href="/dashboard/buy-data">
              <Button className="w-full gap-2 bg-amber-400 text-black hover:bg-amber-300">
                <Wifi className="h-4 w-4" />
                Start Buying Data
              </Button>
            </Link>
          </div>
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
