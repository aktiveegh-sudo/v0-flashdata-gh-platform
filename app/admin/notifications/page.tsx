'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminNotifications } from '@/lib/admin/admin-pages-data'
import { formatDateTime } from '@/lib/admin/utils'

type NotificationRow = Awaited<ReturnType<typeof fetchAdminNotifications>>[number]

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAdminNotifications())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.message || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <AdminPageShell
      title="Notifications"
      description="Full platform notification history across all users."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total" value={String(rows.length)} icon={Bell} />
          <AdminStatCard label="Unread" value={String(rows.filter((r) => !r.is_read).length)} />
          <AdminStatCard label="Read" value={String(rows.filter((r) => r.is_read).length)} />
          <AdminStatCard label="Types" value={String(new Set(rows.map((r) => r.type)).size)} />
        </AdminStatGrid>
      }
    >
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, message, or type..."
          className="pl-9"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Notification Feed" description={`${filtered.length} notification(s)`}>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No notifications found.</p>
            ) : (
              filtered.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-xl border p-4 ${
                    row.is_read
                      ? 'border-gray-100 dark:border-white/5'
                      : 'border-amber-200 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{row.title || 'Notification'}</p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-white/60">{row.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.type ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/50">
                          {row.type}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.is_read
                            ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {row.is_read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-400 dark:text-white/40">{formatDateTime(row.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
