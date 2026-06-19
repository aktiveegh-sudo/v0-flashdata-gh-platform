'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Headphones, MessageCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminNotifications } from '@/lib/admin/admin-pages-data'
import { fetchAuditLogs } from '@/lib/admin/dashboard-metrics'
import { formatDateTime } from '@/lib/admin/utils'

type Ticket = {
  id: string
  source: 'activity' | 'notification'
  title: string
  message: string
  status: string
  created_at: string
}

export default function AdminTicketsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logs, notifications] = await Promise.all([
        fetchAuditLogs({ limit: 200 }),
        fetchAdminNotifications(),
      ])

      const activityTickets: Ticket[] = logs
        .filter((row) => row.entity.toLowerCase().includes('support'))
        .map((row) => ({
          id: row.id,
          source: 'activity' as const,
          title: `${row.activity_type} — ${row.entity}`,
          message: row.message,
          status: 'open',
          created_at: row.created_at,
        }))

      const notificationTickets: Ticket[] = notifications
        .filter(
          (n) =>
            (n.type || '').toLowerCase().includes('support') ||
            (n.type || '').toLowerCase().includes('ticket') ||
            (n.title || '').toLowerCase().includes('support')
        )
        .map((n) => ({
          id: n.id,
          source: 'notification' as const,
          title: n.title || 'Support Notification',
          message: n.message || '',
          status: n.is_read ? 'resolved' : 'open',
          created_at: n.created_at,
        }))

      setTickets(
        [...activityTickets, ...notificationTickets].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCount = useMemo(() => tickets.filter((t) => t.status === 'open').length, [tickets])

  return (
    <AdminPageShell
      title="Support Tickets"
      description="Support requests from admin activity and notification feeds."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Tickets" value={String(tickets.length)} icon={Headphones} />
          <AdminStatCard label="Open" value={String(openCount)} icon={MessageCircle} />
          <AdminStatCard label="Resolved" value={String(tickets.length - openCount)} />
          <AdminStatCard
            label="From Activity"
            value={String(tickets.filter((t) => t.source === 'activity').length)}
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
        <AdminPanel title="Ticket Queue" description={`${tickets.length} support item(s)`}>
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No support tickets found.</p>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={`${ticket.source}-${ticket.id}`}
                  className="rounded-xl border border-gray-100 p-4 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{ticket.title}</p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-white/60">{ticket.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/50">
                        {ticket.source}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ticket.status === 'open'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-400 dark:text-white/40">{formatDateTime(ticket.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
