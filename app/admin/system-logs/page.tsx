'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { fetchAuditLogs, type AuditLogRow } from '@/lib/admin/dashboard-metrics'
import { toCsv } from '@/lib/admin/utils'

const ENTITY_OPTIONS = ['all', 'order', 'user', 'wallet', 'settings', 'system', 'agent', 'support']

export default function AdminSystemLogsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [entity, setEntity] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAuditLogs({ entity, search, limit: 500 })
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system logs')
    } finally {
      setLoading(false)
    }
  }, [entity, search])

  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const exportCsv = () => {
    const csv = toCsv(
      rows.map((row) => ({
        time: row.created_at,
        type: row.activity_type,
        entity: row.entity,
        entity_id: row.entity_id || '',
        actor: row.profiles?.full_name || row.profiles?.email || row.actor_id || '',
        message: row.message,
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flashdata-system-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminPageShell
      title="System Logs"
      description="Full audit trail of admin activity across the platform."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search message, entity, or ID..."
            className="pl-9"
          />
        </div>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0a0a0f] dark:text-white"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'all' ? 'All entities' : opt}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Audit Trail" description={`${rows.length} log entries (limit 500)`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Entity</th>
                  <th className="pb-3 pr-4">Actor</th>
                  <th className="pb-3 pr-4">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No system logs found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="whitespace-nowrap py-3 pr-4 text-gray-600 dark:text-white/70">
                        {new Date(row.created_at).toLocaleString('en-GH')}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          {row.activity_type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-white/80">
                        {row.entity}
                        {row.entity_id ? (
                          <span className="mt-0.5 block font-mono text-xs text-gray-400">{row.entity_id.slice(0, 8)}…</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-white/80">
                        {row.profiles?.full_name || row.profiles?.email || 'System'}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-white/80">{row.message}</td>
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
