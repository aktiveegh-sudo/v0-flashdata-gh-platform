'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAuditLogs, type AuditLogRow } from '@/lib/admin/dashboard-metrics'
import { toCsv } from '@/lib/admin/utils'

const ENTITY_OPTIONS = ['all', 'order', 'user', 'wallet', 'settings', 'system', 'agent']

export default function AdminAuditLogsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [entity, setEntity] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAuditLogs({ entity, search, limit: 100 })
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [entity, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
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
    a.download = `flashdata-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
            Full admin activity trail synced from the platform.
          </p>
        </div>
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
      </div>

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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/50">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-white/50">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-white/70">
                        {new Date(row.created_at).toLocaleString('en-GH')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          {row.activity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-white/80">
                        {row.entity}
                        {row.entity_id ? (
                          <span className="mt-0.5 block font-mono text-xs text-gray-400">{row.entity_id.slice(0, 8)}…</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-white/80">
                        {row.profiles?.full_name || row.profiles?.email || 'System'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-white/80">{row.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
