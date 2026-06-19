'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAuditLogs, type AuditLogRow } from '@/lib/admin/dashboard-metrics'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/admin/utils'

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suspended, setSuspended] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [logs, setLogs] = useState<AuditLogRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, auditRes] = await Promise.all([
        supabase.client.rpc('admin_list_users'),
        fetchAuditLogs({ limit: 30 }),
      ])

      const users = (usersRes.data as Array<{ status: string }>) || []
      setTotalUsers(users.length)
      setSuspended(users.filter((u) => u.status === 'suspended').length)
      setLogs(auditRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <AdminPageShell
      title="Security"
      description="Platform security overview — suspended accounts and recent audit activity."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Users" value={String(totalUsers)} icon={Shield} />
          <AdminStatCard label="Suspended" value={String(suspended)} icon={ShieldAlert} />
          <AdminStatCard label="Active" value={String(totalUsers - suspended)} icon={ShieldCheck} />
          <AdminStatCard label="Recent Audit Events" value={String(logs.length)} />
        </AdminStatGrid>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Recent Audit Logs" description="Latest security-relevant admin activity">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No audit logs found.</p>
            ) : (
              logs.map((row) => (
                <div key={row.id} className="rounded-xl border border-gray-100 p-4 dark:border-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        {row.activity_type}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/50">
                        {row.entity}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-white/40">{formatDateTime(row.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-white/80">{row.message}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    Actor: {row.profiles?.full_name || row.profiles?.email || 'System'}
                  </p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
