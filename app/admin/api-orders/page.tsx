'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchApiOrders } from '@/lib/admin/admin-pages-data'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'

type ApiOrder = Awaited<ReturnType<typeof fetchApiOrders>>[number]

export default function AdminApiOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApiOrder[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchApiOrders())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const delivered = rows.filter((r) => r.status === 'delivered').length
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <AdminPageShell
      title="API Orders"
      description="Recent orders placed through the REST API integration."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Recent Orders" value={String(rows.length)} icon={Package} />
          <AdminStatCard label="Delivered" value={String(delivered)} />
          <AdminStatCard label="Pending" value={String(rows.filter((r) => r.status === 'pending').length)} />
          <AdminStatCard label="Total Value" value={ghanaCurrency(totalAmount)} />
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
        <AdminPanel title="Order Feed" description="Last 50 API orders">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No API orders found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const profile = row.profiles as { full_name?: string | null } | null
                    return (
                      <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                        <td className="py-3 pr-4 font-mono text-xs text-gray-700 dark:text-white/80">
                          {row.reference || row.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-gray-900 dark:text-white">{profile?.full_name || 'API User'}</td>
                        <td className="py-3 pr-4 font-semibold">{ghanaCurrency(Number(row.amount || 0))}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
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
