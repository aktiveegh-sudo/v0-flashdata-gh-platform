'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Globe, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchApiUsersStats } from '@/lib/admin/admin-pages-data'
import { formatDateTime } from '@/lib/admin/utils'

type ApiUserStat = Awaited<ReturnType<typeof fetchApiUsersStats>>[number]

export default function AdminApiNetworkPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApiUserStat[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchApiUsersStats())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const active = rows.filter((r) => r.is_active).length

  return (
    <AdminPageShell
      title="API Network Intelligence"
      description="Monitor API consumer accounts, activity, and integration health."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total API Users" value={String(rows.length)} icon={Users} />
          <AdminStatCard label="Active" value={String(active)} icon={Activity} />
          <AdminStatCard label="Inactive" value={String(rows.length - active)} icon={Globe} />
          <AdminStatCard
            label="Used Recently"
            value={String(rows.filter((r) => r.last_used_at).length)}
            hint="Accounts with last_used_at set"
          />
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
        <AdminPanel title="API Consumers" description="Registered API network partners">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No API users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{row.name || '-'}</td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-white/80">{row.email || '-'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50'
                          }`}
                        >
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-white/70">{formatDateTime(row.created_at)}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-white/70">{formatDateTime(row.last_used_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
