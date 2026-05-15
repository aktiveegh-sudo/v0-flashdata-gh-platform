'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

type DailyPoint = { day: string; revenue: number }
type NetworkPoint = { network: string; sales: number }
type ActivityRow = {
  id: string
  message: string
  entity: string
  created_at: string
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [activePackages, setActivePackages] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState<DailyPoint[]>([])
  const [salesByNetwork, setSalesByNetwork] = useState<NetworkPoint[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])

  const loadMetrics = async () => {
    setLoading(true)

    const [
      transactionsRes,
      usersRes,
      salesRes,
      packagesRes,
      withdrawalsRes,
      ordersPendingRes,
      ordersRes,
      activityRes,
    ] = await Promise.all([
      supabase.client
        .from('transactions')
        .select('amount,status,created_at,type')
        .eq('status', 'success'),
      supabase.client.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.client.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'success'),
      supabase.client.from('data_packages').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.client.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.client.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.client.from('orders').select('amount,created_at,data_packages(network)').eq('status', 'success'),
      supabase.client.from('admin_activity').select('id,message,entity,created_at').order('created_at', { ascending: false }).limit(8),
    ])

    const transactions = transactionsRes.data || []
    const today = new Date().toISOString().slice(0, 10)
    const revenue = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0)
    const todayRev = transactions
      .filter((t) => (t.created_at || '').slice(0, 10) === today)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0)

    const days: DailyPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const amount = transactions
        .filter((t) => (t.created_at || '').slice(0, 10) === key)
        .reduce((acc, t) => acc + Number(t.amount || 0), 0)

      days.push({
        day: d.toLocaleDateString('en-GH', { weekday: 'short' }),
        revenue: Number(amount.toFixed(2)),
      })
    }

    const orderRows = (ordersRes.data || []) as Array<{ amount: number; data_packages?: { network?: string } | null }>
    const networkMap = new Map<string, number>()
    for (const row of orderRows) {
      const network = row.data_packages?.network || 'Unknown'
      networkMap.set(network, (networkMap.get(network) || 0) + Number(row.amount || 0))
    }

    setTodayRevenue(todayRev)
    setTotalRevenue(revenue)
    setTotalUsers(usersRes.count || 0)
    setTotalSales(salesRes.count || 0)
    setActivePackages(packagesRes.count || 0)
    setPendingWithdrawals(withdrawalsRes.count || 0)
    setPendingOrders(ordersPendingRes.count || 0)
    setDailyRevenue(days)
    setSalesByNetwork(
      Array.from(networkMap.entries()).map(([network, sales]) => ({ network, sales: Number(sales.toFixed(2)) }))
    )
    setActivity((activityRes.data as ActivityRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadMetrics()

    const channel = supabase.client
      .channel('admin-overview-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => void loadMetrics())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const cards = useMemo(
    () => [
      { label: 'Revenue Today', value: ghanaCurrency(todayRevenue) },
      { label: 'Total Revenue', value: ghanaCurrency(totalRevenue) },
      { label: 'Total Users', value: totalUsers.toLocaleString() },
      { label: 'Total Sales', value: totalSales.toLocaleString() },
      { label: 'Active Packages', value: activePackages.toLocaleString() },
      { label: 'Pending Withdrawals', value: pendingWithdrawals.toLocaleString() },
      { label: 'Pending Orders', value: pendingOrders.toLocaleString() },
    ],
    [todayRevenue, totalRevenue, totalUsers, totalSales, activePackages, pendingWithdrawals, pendingOrders]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Realtime operational intelligence for FlashData GH.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? '...' : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v: number) => ghanaCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#00C853" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Network</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByNetwork}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="network" />
                <YAxis />
                <Tooltip formatter={(v: number) => ghanaCurrency(Number(v))} />
                <Bar dataKey="sales" fill="#FFB300" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">{item.entity}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
                </div>
                <p className="mt-2 text-sm">{item.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
