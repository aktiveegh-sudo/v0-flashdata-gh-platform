'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Store, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAgentPerformance, type AgentPerformanceRow } from '@/lib/admin/dashboard-metrics'

export default function AdminAgentPerformancePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AgentPerformanceRow[]>([])

  useEffect(() => {
    let cancelled = false
    fetchAgentPerformance()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load agent performance')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totals = rows.reduce(
    (acc, row) => ({
      orders: acc.orders + row.totalOrders,
      delivered: acc.delivered + row.deliveredOrders,
      revenue: acc.revenue + row.revenue,
    }),
    { orders: 0, delivered: 0, revenue: 0 }
  )

  if (loading) return <FlashPageLoader />
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Performance</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
          Store and dashboard sales ranked by delivered revenue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Stores', value: rows.filter((r) => r.isActive).length, icon: Store },
          { label: 'Total Orders', value: totals.orders, icon: TrendingUp },
          { label: 'Total Revenue', value: `GHS ${totals.revenue.toFixed(2)}`, icon: TrendingUp },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/50">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-white/50">
                    No agent stores found yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.agentId}-${row.storeSlug}`} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.agentName}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-white/80">{row.storeName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50'
                        }`}
                      >
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.totalOrders}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.deliveredOrders}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{row.pendingOrders}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      GHS {row.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/store/${row.storeSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
