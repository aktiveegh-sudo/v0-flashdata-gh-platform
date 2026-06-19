'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminSubAgents } from '@/lib/admin/admin-pages-data'
import { formatDateTime } from '@/lib/admin/utils'

type SubAgentRow = Awaited<ReturnType<typeof fetchAdminSubAgents>>[number]

export default function AdminSubAgentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SubAgentRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAdminSubAgents())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sub-agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const active = rows.filter((r) => r.status === 'active').length

  return (
    <AdminPageShell
      title="Sub-Agents"
      description="All sub-agent relationships and commission rates."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Sub-Agents" value={String(rows.length)} icon={Users} />
          <AdminStatCard label="Active" value={String(active)} icon={UserPlus} />
          <AdminStatCard label="Pending" value={String(rows.filter((r) => r.status === 'pending').length)} />
          <AdminStatCard label="Suspended" value={String(rows.filter((r) => r.status === 'suspended').length)} />
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
        <AdminPanel title="Sub-Agent Directory" description={`${rows.length} relationship(s)`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Parent Agent</th>
                  <th className="pb-3 pr-4">Sub-Agent</th>
                  <th className="pb-3 pr-4">Commission</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No sub-agents found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const parent = row.parent as { full_name?: string | null } | null
                    const child = row.child as { full_name?: string | null; email?: string | null } | null
                    return (
                      <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                          {parent?.full_name || row.parent_agent_id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-white/80">
                          {child?.full_name || child?.email || row.user_id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-amber-600 dark:text-amber-400">
                          {Number(row.commission_rate || 0).toFixed(1)}%
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
                                : row.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-white/70">{formatDateTime(row.created_at)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
