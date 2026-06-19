'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Box, ExternalLink, Layers, Network, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { supabase } from '@/lib/supabase/client'

type NetworkCount = { network: string; total: number; active: number }

export default function AdminFlashVendorPage() {
  const [loading, setLoading] = useState(true)
  const [packageCount, setPackageCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [serviceCount, setServiceCount] = useState(0)
  const [networks, setNetworks] = useState<NetworkCount[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [packagesRes, servicesRes] = await Promise.all([
      supabase.client.from('data_packages').select('network,is_active'),
      supabase.client.from('online_services').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ])

    const packages = packagesRes.data || []
    setPackageCount(packages.length)
    setActiveCount(packages.filter((p) => p.is_active).length)
    setServiceCount(servicesRes.count || 0)

    const map = new Map<string, { total: number; active: number }>()
    for (const pkg of packages) {
      const net = pkg.network || 'Unknown'
      const entry = map.get(net) || { total: 0, active: 0 }
      entry.total++
      if (pkg.is_active) entry.active++
      map.set(net, entry)
    }
    setNetworks(
      Array.from(map.entries())
        .map(([network, counts]) => ({ network, ...counts }))
        .sort((a, b) => b.active - a.active)
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const quickLinks = [
    { href: '/admin/packages', label: 'Manage Packages', icon: Box },
    { href: '/admin/add-service', label: 'Add Service', icon: Layers },
    { href: '/admin/orders', label: 'View Orders', icon: Network },
  ]

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Flash Vendor Master"
      description="Package inventory, active networks, and vendor management shortcuts."
      actions={
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Packages" value={String(packageCount)} icon={Box} />
          <AdminStatCard label="Active Packages" value={String(activeCount)} icon={Layers} />
          <AdminStatCard label="Active Networks" value={String(networks.filter((n) => n.active > 0).length)} icon={Network} />
          <AdminStatCard label="Online Services" value={String(serviceCount)} />
        </AdminStatGrid>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Networks" description="Package counts by network">
          <div className="space-y-2">
            {networks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-white/50">No packages configured.</p>
            ) : (
              networks.map((net) => (
                <div
                  key={net.network}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-white/5"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{net.network}</span>
                  <span className="text-sm text-gray-500 dark:text-white/50">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{net.active}</span> active / {net.total} total
                  </span>
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Quick Links" description="Jump to vendor management tools">
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/5 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5"
              >
                <div className="flex items-center gap-3">
                  <link.icon className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{link.label}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}
