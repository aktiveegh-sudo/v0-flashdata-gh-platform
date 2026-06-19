'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchSystemHealth } from '@/lib/admin/admin-pages-data'

export default function AdminSystemHealthPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<Awaited<ReturnType<typeof fetchSystemHealth>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setHealth(await fetchSystemHealth())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const healthyCount = health?.tables.filter((t) => t.ok).length || 0
  const totalRows = health?.tables.reduce((s, t) => s + t.count, 0) || 0

  return (
    <AdminPageShell
      title="System Health"
      description="Database table status, row counts, and pending queue metrics."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        health ? (
          <AdminStatGrid>
            <AdminStatCard
              label="Tables Healthy"
              value={`${healthyCount}/${health.tables.length}`}
              icon={Database}
            />
            <AdminStatCard label="Total Rows" value={totalRows.toLocaleString()} icon={Activity} />
            <AdminStatCard label="Pending Orders" value={String(health.pendingOrders)} icon={AlertCircle} />
            <AdminStatCard label="Pending Withdrawals" value={String(health.pendingWithdrawals)} />
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
      ) : health ? (
        <AdminPanel title="Table Status" description="Live row counts from core platform tables">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {health.tables.map((table) => (
              <div
                key={table.table}
                className={`rounded-xl border px-4 py-4 ${
                  table.ok
                    ? 'border-green-100 bg-green-50/50 dark:border-green-900/20 dark:bg-green-950/20'
                    : 'border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-gray-900 dark:text-white">{table.table}</span>
                  {table.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{table.count.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">{table.ok ? 'Accessible' : 'Error'}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}
    </AdminPageShell>
  )
}
