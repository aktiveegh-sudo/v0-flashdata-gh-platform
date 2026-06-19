'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import {
  LazyBar,
  LazyBarChart,
  LazyCartesianGrid,
  LazyResponsiveContainer,
  LazyTooltip,
  LazyXAxis,
  LazyYAxis,
} from '@/components/admin/lazy-charts'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminProfits } from '@/lib/admin/admin-pages-data'
import { ghanaCurrency } from '@/lib/admin/utils'

export default function AdminProfitsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminProfits>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminProfits())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profits')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = data
    ? [
        { name: 'Direct', revenue: data.orderRevenue, orders: data.orderCount },
        { name: 'Store', revenue: data.storeRevenue, orders: data.storeOrderCount },
        { name: 'Tx Volume', revenue: data.txVolume, orders: 0 },
      ]
    : []

  const estimatedProfit = data ? data.totalRevenue * 0.28 : 0

  return (
    <AdminPageShell
      title="Profits"
      description="Revenue and profit summary from delivered orders."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        data ? (
          <AdminStatGrid>
            <AdminStatCard label="Total Revenue" value={ghanaCurrency(data.totalRevenue)} icon={TrendingUp} />
            <AdminStatCard label="Direct Revenue" value={ghanaCurrency(data.orderRevenue)} icon={BarChart3} />
            <AdminStatCard label="Store Revenue" value={ghanaCurrency(data.storeRevenue)} />
            <AdminStatCard label="Est. Net Profit" value={ghanaCurrency(estimatedProfit)} hint="~28% margin" />
          </AdminStatGrid>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="Revenue by Channel">
            <div className="h-72">
              <LazyResponsiveContainer width="100%" height="100%">
                <LazyBarChart data={chartData}>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <LazyXAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <LazyYAxis tick={{ fontSize: 12 }} />
                  <LazyTooltip formatter={(v: number) => ghanaCurrency(Number(v))} />
                  <LazyBar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </LazyBarChart>
              </LazyResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel title="Order Volume">
            <div className="h-72">
              <LazyResponsiveContainer width="100%" height="100%">
                <LazyBarChart data={chartData.filter((d) => d.orders > 0)}>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <LazyXAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <LazyYAxis tick={{ fontSize: 12 }} />
                  <LazyTooltip />
                  <LazyBar dataKey="orders" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </LazyBarChart>
              </LazyResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel title="Summary" className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Delivered Direct Orders', value: String(data.orderCount) },
                { label: 'Delivered Store Orders', value: String(data.storeOrderCount) },
                { label: 'Transaction Volume', value: ghanaCurrency(data.txVolume) },
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
        </div>
      ) : null}
    </AdminPageShell>
  )
}
