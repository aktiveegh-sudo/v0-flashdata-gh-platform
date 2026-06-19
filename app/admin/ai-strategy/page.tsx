'use client'

import { useEffect, useMemo, useState } from 'react'
import { Brain, Lightbulb, Target, TrendingUp, Zap } from 'lucide-react'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminAnalytics } from '@/lib/admin/dashboard-metrics'
import { ghanaCurrency } from '@/lib/admin/utils'

export default function AdminAiStrategyPage() {
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

  const recommendations = useMemo(() => {
    if (!data) return []
    const items: Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }> = []

    const pending = data.ordersByStatus.find((s) => s.status === 'pending')?.count || 0
    if (pending > 10) {
      items.push({
        title: 'Clear pending order backlog',
        detail: `${pending} orders are still pending. Review delivery provider health and auto-complete rules.`,
        priority: 'high',
      })
    }

    if (data.successRate < 95) {
      items.push({
        title: 'Improve transaction success rate',
        detail: `Current success rate is ${data.successRate}%. Check Paystack webhooks and wallet credit flows.`,
        priority: 'high',
      })
    }

    const topNetwork = [...data.salesByNetwork].sort((a, b) => b.sales - a.sales)[0]
    if (topNetwork) {
      items.push({
        title: `Double down on ${topNetwork.network}`,
        detail: `${topNetwork.network} leads with ${ghanaCurrency(topNetwork.sales)} in delivered revenue. Consider featured promos.`,
        priority: 'medium',
      })
    }

    const recentGrowth = data.userGrowth.slice(-3).reduce((s, d) => s + d.revenue, 0)
    if (recentGrowth < 5) {
      items.push({
        title: 'Boost user acquisition',
        detail: 'New user signups slowed in the last 3 days. Run referral campaigns or agent outreach.',
        priority: 'medium',
      })
    }

    if (data.todayRevenue < data.totalRevenue / 30) {
      items.push({
        title: 'Today underperforming vs average',
        detail: `Today's revenue (${ghanaCurrency(data.todayRevenue)}) trails the monthly daily average.`,
        priority: 'low',
      })
    }

    if (items.length === 0) {
      items.push({
        title: 'Platform performing well',
        detail: 'Key metrics are healthy. Monitor agent performance and maintain package pricing.',
        priority: 'low',
      })
    }

    return items
  }, [data])

  if (loading) return <FlashPageLoader />
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    )
  }
  if (!data) return null

  return (
    <AdminPageShell
      title="AI Strategy"
      description="Data-driven insights and recommended actions for platform growth."
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Today's Revenue" value={ghanaCurrency(data.todayRevenue)} icon={TrendingUp} />
          <AdminStatCard label="Total Revenue" value={ghanaCurrency(data.totalRevenue)} icon={Target} />
          <AdminStatCard label="Success Rate" value={`${data.successRate}%`} icon={Zap} />
          <AdminStatCard label="Total Orders" value={String(data.totalOrders)} icon={Brain} />
        </AdminStatGrid>
      }
    >
      <AdminPanel title="Analytics Summary" description="Live snapshot from platform data">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.salesByNetwork.map((row) => (
            <div
              key={row.network}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">{row.network}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{ghanaCurrency(row.sales)}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="AI Recommendations" description="Suggested actions based on current metrics">
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.title}
              className="flex items-start gap-3 rounded-xl border border-gray-100 p-4 dark:border-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{rec.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      rec.priority === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                        : rec.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50'
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-white/60">{rec.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}
