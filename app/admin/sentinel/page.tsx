'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertCircle, Brain, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchSystemHealth } from '@/lib/admin/admin-pages-data'
import { fetchAuditLogs, type AuditLogRow } from '@/lib/admin/dashboard-metrics'
import { formatDateTime } from '@/lib/admin/utils'

export default function AdminSentinelPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<Awaited<ReturnType<typeof fetchSystemHealth>> | null>(null)
  const [activity, setActivity] = useState<AuditLogRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthData, logs] = await Promise.all([fetchSystemHealth(), fetchAuditLogs({ limit: 10 })])
      setHealth(healthData)
      setActivity(logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sentinel data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const healthyTables = health?.tables.filter((t) => t.ok).length || 0
  const totalTables = health?.tables.length || 0
  const alerts = (health?.pendingOrders || 0) + (health?.pendingWithdrawals || 0)

  return (
    <AdminPageShell
      title="Sentinel AI"
      description="AI-powered monitoring cards from system health and recent activity."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        health ? (
          <AdminStatGrid>
            <AdminStatCard label="System Status" value={healthyTables === totalTables ? 'Healthy' : 'Degraded'} icon={Brain} />
            <AdminStatCard label="Pending Orders" value={String(health.pendingOrders)} icon={AlertCircle} />
            <AdminStatCard label="Pending Withdrawals" value={String(health.pendingWithdrawals)} />
            <AdminStatCard label="Active Alerts" value={String(alerts)} icon={Activity} />
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
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="Health Monitors">
            <div className="space-y-2">
              {health.tables.map((table) => (
                <div
                  key={table.table}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    {table.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium capitalize text-gray-900 dark:text-white">{table.table}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-white/50">{table.count.toLocaleString()} rows</span>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Activity Signals" description="Recent admin events for anomaly detection">
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-white/50">No recent activity.</p>
              ) : (
                activity.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-100 px-4 py-3 dark:border-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{row.entity}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-white/80">{row.message}</p>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
