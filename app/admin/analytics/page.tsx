'use client'

import { useEffect, useState } from 'react'
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { FlashPageLoader } from '@/components/flash-loader'
import {
  LazyBar,
  LazyBarChart,
  LazyCartesianGrid,
  LazyLine,
  LazyLineChart,
  LazyResponsiveContainer,
  LazyTooltip,
  LazyXAxis,
  LazyYAxis,
} from '@/components/admin/lazy-charts'
import { fetchAdminAnalytics } from '@/lib/admin/dashboard-metrics'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminAnalytics>> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAdminAnalytics()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <FlashPageLoader />
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    )
  }
  if (!data) return null

  const cards = [
    { label: "Today's Revenue", value: `GHS ${data.todayRevenue.toFixed(2)}`, icon: DollarSign },
    { label: 'Total Revenue', value: `GHS ${data.totalRevenue.toFixed(2)}`, icon: TrendingUp },
    { label: 'Total Orders', value: String(data.totalOrders), icon: ShoppingCart },
    { label: 'Total Users', value: String(data.totalUsers), icon: Users },
    { label: 'Transactions', value: String(data.totalTransactions), icon: BarChart3 },
    { label: 'Success Rate', value: `${data.successRate}%`, icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
          Live revenue, orders, and user growth from your platform data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Revenue (7 days)</h2>
          <div className="mt-4 h-72">
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyLineChart data={data.dailyRevenue}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <LazyXAxis dataKey="day" tick={{ fontSize: 12 }} />
                <LazyYAxis tick={{ fontSize: 12 }} />
                <LazyTooltip />
                <LazyLine type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LazyLineChart>
            </LazyResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Orders (7 days)</h2>
          <div className="mt-4 h-72">
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyBarChart data={data.dailyRevenue}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <LazyXAxis dataKey="day" tick={{ fontSize: 12 }} />
                <LazyYAxis tick={{ fontSize: 12 }} />
                <LazyTooltip />
                <LazyBar dataKey="orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sales by Network</h2>
          <div className="mt-4 h-72">
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyBarChart data={data.salesByNetwork}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <LazyXAxis dataKey="network" tick={{ fontSize: 12 }} />
                <LazyYAxis tick={{ fontSize: 12 }} />
                <LazyTooltip />
                <LazyBar dataKey="sales" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">New Users (7 days)</h2>
          <div className="mt-4 h-72">
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyLineChart data={data.userGrowth}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <LazyXAxis dataKey="day" tick={{ fontSize: 12 }} />
                <LazyYAxis tick={{ fontSize: 12 }} />
                <LazyTooltip />
                <LazyLine type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LazyLineChart>
            </LazyResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Orders by Status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.ordersByStatus.map((row) => (
            <div key={row.status} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">{row.status}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{row.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
