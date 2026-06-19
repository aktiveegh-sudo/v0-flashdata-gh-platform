'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'

type MashupOrder = {
  id: string
  source: 'direct' | 'store'
  customer: string
  amount: number
  status: string
  created_at: string
}

export default function AdminMashupOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MashupOrder[]>([])
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [directRes, storeRes] = await Promise.all([
        supabase.client
          .from('orders')
          .select('id,amount,status,created_at,profiles(full_name,email)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.client
          .from('agent_store_orders')
          .select('id,total_price,status,created_at,customer_name,customer_email')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (directRes.error) throw new Error(directRes.error.message)
      if (storeRes.error) throw new Error(storeRes.error.message)

      const direct: MashupOrder[] = (directRes.data || []).map((row) => {
        const profile = row.profiles as { full_name?: string | null; email?: string | null } | null
        return {
          id: row.id,
          source: 'direct' as const,
          customer: profile?.full_name || profile?.email || 'User',
          amount: Number(row.amount || 0),
          status: row.status,
          created_at: row.created_at,
        }
      })

      const store: MashupOrder[] = (storeRes.data || []).map((row) => ({
        id: row.id,
        source: 'store' as const,
        customer: row.customer_name || row.customer_email || 'Customer',
        amount: Number(row.total_price || 0),
        status: row.status,
        created_at: row.created_at,
      }))

      setRows(
        [...direct, ...store].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  return (
    <AdminPageShell
      title="Mash Up Orders"
      description="Combined view of direct dashboard orders and agent store orders."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Orders" value={String(rows.length)} icon={ShoppingCart} />
          <AdminStatCard label="Direct" value={String(rows.filter((r) => r.source === 'direct').length)} />
          <AdminStatCard label="Store" value={String(rows.filter((r) => r.source === 'store').length)} />
          <AdminStatCard
            label="Delivered Value"
            value={ghanaCurrency(rows.filter((r) => r.status === 'delivered').reduce((s, r) => s + r.amount, 0))}
          />
        </AdminStatGrid>
      }
    >
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0a0a0f] dark:text-white"
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="delivered">Delivered</option>
        <option value="failed">Failed</option>
      </select>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Combined Orders" description={`${filtered.length} order(s) shown`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          {row.source === 'store' ? 'Store' : 'Direct'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{row.customer}</td>
                      <td className="py-3 pr-4 font-semibold">{ghanaCurrency(row.amount)}</td>
                      <td className="py-3 pr-4 capitalize text-gray-700 dark:text-white/80">{row.status}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-white/70">{formatDateTime(row.created_at)}</td>
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
