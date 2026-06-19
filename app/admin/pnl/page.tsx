'use client'

import { useCallback, useEffect, useState } from 'react'
import { DollarSign, Minus, Plus, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminProfits } from '@/lib/admin/admin-pages-data'
import { ghanaCurrency } from '@/lib/admin/utils'

export default function AdminPnlPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminProfits>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminProfits())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load P&L data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const estimatedCost = data ? data.totalRevenue * 0.72 : 0
  const grossProfit = data ? data.totalRevenue - estimatedCost : 0
  const margin = data && data.totalRevenue ? ((grossProfit / data.totalRevenue) * 100).toFixed(1) : '0'

  return (
    <AdminPageShell
      title="P&L"
      description="Profit and loss breakdown from delivered orders and transaction volume."
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
            <AdminStatCard label="Est. Cost (72%)" value={ghanaCurrency(estimatedCost)} icon={Minus} />
            <AdminStatCard label="Gross Profit" value={ghanaCurrency(grossProfit)} icon={Plus} />
            <AdminStatCard label="Margin" value={`${margin}%`} icon={DollarSign} />
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
          <AdminPanel title="Revenue Breakdown">
            <div className="space-y-3">
              {[
                { label: 'Direct Orders', value: data.orderRevenue, count: data.orderCount },
                { label: 'Store Orders', value: data.storeRevenue, count: data.storeOrderCount },
                { label: 'Transaction Volume', value: data.txVolume, count: null },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-white/5"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{row.label}</p>
                    {row.count != null ? (
                      <p className="text-xs text-gray-500 dark:text-white/50">{row.count} delivered orders</p>
                    ) : null}
                  </div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{ghanaCurrency(row.value)}</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Cost & Profit">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/20 dark:bg-red-950/20">
                <p className="font-medium text-gray-900 dark:text-white">Estimated Provider Cost</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{ghanaCurrency(estimatedCost)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50/50 px-4 py-3 dark:border-green-900/20 dark:bg-green-950/20">
                <p className="font-medium text-gray-900 dark:text-white">Gross Profit</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{ghanaCurrency(grossProfit)}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Cost estimate uses 72% of delivered revenue as provider cost. Adjust package cost prices for precise P&L.
              </p>
            </div>
          </AdminPanel>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
