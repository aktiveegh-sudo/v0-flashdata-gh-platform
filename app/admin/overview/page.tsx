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

type RecentUserRow = {
  id: string
  full_name: string | null
  email: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  created_at: string
}

type RecentOrderRow = {
  id: string
  created_at: string
  source: 'direct' | 'store'
  customer: string
  amount: number
  status: string
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [activePackages, setActivePackages] = useState(0)
  const [activeServices, setActiveServices] = useState(0)
  const [apiUsers, setApiUsers] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Array<{ id: string; type: string; amount: number; status: string; reference: string; created_at: string }>>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyPoint[]>([])
  const [salesByNetwork, setSalesByNetwork] = useState<NetworkPoint[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([])

  const loadMetrics = async () => {
    setLoading(true)

    await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)
    await supabase.client.rpc('sync_auth_users_to_profiles_wallets')

    const [
      ordersSuccessRes,
      storeOrdersCompletedRes,
      ordersTotalRes,
      storeOrdersTotalRes,
      ordersSuccessCountRes,
      storeOrdersCompletedCountRes,
      usersRpcRes,
      packagesRes,
      servicesRes,
      apiUsersRes,
      withdrawalsRes,
      ordersPendingRes,
      storeOrdersPendingRes,
      activityRes,
      directRecentOrdersRes,
      storeRecentOrdersRes,
      transactionsCountRes,
      recentTransactionsRes,
    ] = await Promise.all([
      supabase.client
        .from('orders')
        .select('amount,created_at,data_packages(network)')
        .eq('status', 'delivered'),
      supabase.client
        .from('agent_store_orders')
        .select('total_price,created_at,item_type,data_packages(network)')
        .eq('status', 'delivered'),
      supabase.client.from('orders').select('id', { count: 'exact', head: true }),
      supabase.client.from('agent_store_orders').select('id', { count: 'exact', head: true }),
      supabase.client.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.client.from('agent_store_orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.client.rpc('admin_list_users'),
      supabase.client.from('data_packages').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.client.from('online_services').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.client.from('api_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.client.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.client.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.client.from('agent_store_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.client.from('admin_activity').select('id,message,entity,created_at').order('created_at', { ascending: false }).limit(8),
      supabase.client
        .from('orders')
        .select('id,created_at,amount,status,profiles(full_name,email)')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.client
        .from('agent_store_orders')
        .select('id,created_at,total_price,status,customer_name,customer_email')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.client.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.client
        .from('transactions')
        .select('id,type,amount,status,reference,created_at')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    type OrderRevenueRow = { amount: number; created_at: string; data_packages?: { network?: string } | null }
    type StoreRevenueRow = {
      total_price: number
      created_at: string
      item_type: 'data' | 'service'
      data_packages?: { network?: string } | null
    }

    const ordersRevenueRows = (ordersSuccessRes.data || []) as OrderRevenueRow[]
    const storeRevenueRows = (storeOrdersCompletedRes.data || []) as StoreRevenueRow[]

    const today = new Date().toISOString().slice(0, 10)
    const ordersRevenue = ordersRevenueRows.reduce((acc, row) => acc + Number(row.amount || 0), 0)
    const storeRevenue = storeRevenueRows.reduce((acc, row) => acc + Number(row.total_price || 0), 0)
    const revenue = ordersRevenue + storeRevenue

    const todayOrdersRevenue = ordersRevenueRows
      .filter((row) => (row.created_at || '').slice(0, 10) === today)
      .reduce((acc, row) => acc + Number(row.amount || 0), 0)

    const todayStoreRevenue = storeRevenueRows
      .filter((row) => (row.created_at || '').slice(0, 10) === today)
      .reduce((acc, row) => acc + Number(row.total_price || 0), 0)

    const todayRev = todayOrdersRevenue + todayStoreRevenue

    const days: DailyPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)

      const orderAmount = ordersRevenueRows
        .filter((row) => (row.created_at || '').slice(0, 10) === key)
        .reduce((acc, row) => acc + Number(row.amount || 0), 0)

      const storeAmount = storeRevenueRows
        .filter((row) => (row.created_at || '').slice(0, 10) === key)
        .reduce((acc, row) => acc + Number(row.total_price || 0), 0)

      days.push({
        day: d.toLocaleDateString('en-GH', { weekday: 'short' }),
        revenue: Number((orderAmount + storeAmount).toFixed(2)),
      })
    }

    const networkMap = new Map<string, number>()
    for (const row of ordersRevenueRows) {
      const network = row.data_packages?.network || 'Unknown'
      networkMap.set(network, (networkMap.get(network) || 0) + Number(row.amount || 0))
    }

    for (const row of storeRevenueRows) {
      const network = row.item_type === 'service' ? 'Services' : row.data_packages?.network || 'Unknown'
      networkMap.set(network, (networkMap.get(network) || 0) + Number(row.total_price || 0))
    }

    const salesCount = (ordersSuccessCountRes.count || 0) + (storeOrdersCompletedCountRes.count || 0)
    const allOrdersCount = (ordersTotalRes.count || 0) + (storeOrdersTotalRes.count || 0)
    const pendingAllOrders = (ordersPendingRes.count || 0) + (storeOrdersPendingRes.count || 0)

    const usersRows = ((usersRpcRes.data as RecentUserRow[] | null) || []).slice(0, 6)
    const directOrders = ((directRecentOrdersRes.data || []) as Array<{ id: string; created_at: string; amount: number; status: string; profiles?: { full_name?: string | null; email?: string | null } | null }>).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      source: 'direct' as const,
      customer: row.profiles?.full_name || row.profiles?.email || 'User',
      amount: Number(row.amount || 0),
      status: row.status,
    }))
    const storeOrders = ((storeRecentOrdersRes.data || []) as Array<{ id: string; created_at: string; total_price: number; status: string; customer_name?: string | null; customer_email?: string | null }>).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      source: 'store' as const,
      customer: row.customer_name || row.customer_email || 'Customer',
      amount: Number(row.total_price || 0),
      status: row.status,
    }))

    const latestOrders = [...directOrders, ...storeOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)

    setTodayRevenue(todayRev)
    setTotalRevenue(revenue)
    setTotalUsers(((usersRpcRes.data as RecentUserRow[] | null) || []).length)
    setTotalSales(salesCount)
    setTotalOrders(allOrdersCount)
    setActivePackages(packagesRes.count || 0)
    setActiveServices(servicesRes.count || 0)
    setApiUsers(apiUsersRes.count || 0)
    setPendingWithdrawals(withdrawalsRes.count || 0)
    setPendingOrders(pendingAllOrders)
    setDailyRevenue(days)
    setSalesByNetwork(
      Array.from(networkMap.entries()).map(([network, sales]) => ({ network, sales: Number(sales.toFixed(2)) }))
    )
    setActivity((activityRes.data as ActivityRow[]) || [])
    setRecentUsers(usersRows)
    setRecentOrders(latestOrders)
    setTotalTransactions(transactionsCountRes.count || 0)
    setRecentTransactions((recentTransactionsRes.data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadMetrics()

    const channel = supabase.client
      .channel('admin-overview-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_orders' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_packages' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_services' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_users' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_activity' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => void loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadMetrics())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const cards = useMemo(
    () => [
      { label: "Today's Revenue", value: ghanaCurrency(todayRevenue) },
      { label: 'Total Revenue', value: ghanaCurrency(totalRevenue) },
      { label: 'Total Users', value: totalUsers.toLocaleString() },
      { label: 'Total Orders', value: totalOrders.toLocaleString() },
      { label: 'Total Sales', value: totalSales.toLocaleString() },
      { label: 'Total Transactions', value: totalTransactions.toLocaleString() },
      { label: 'Active Packages', value: activePackages.toLocaleString() },
      { label: 'Active Services', value: activeServices.toLocaleString() },
      { label: 'Active API Users', value: apiUsers.toLocaleString() },
      { label: 'Pending Withdrawals', value: pendingWithdrawals.toLocaleString() },
      { label: 'Pending Orders', value: pendingOrders.toLocaleString() },
    ],
    [
      todayRevenue,
      totalRevenue,
      totalUsers,
      totalOrders,
      totalSales,
      activePackages,
      activeServices,
      apiUsers,
      pendingWithdrawals,
      pendingOrders,
    ]
  )

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-white p-6 shadow-sm dark:border-amber-400/20 dark:bg-[#0a110d]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Admin Insight</p>
          <h1 className="mt-2 text-2xl font-black lg:text-3xl">Global Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-white/60">
            High-level platform metrics and financial reconciliation for FlashData GH.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-white/45">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{loading ? '...' : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
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

        <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
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

      <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{user.full_name || user.email || 'Unnamed user'}</p>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{user.email || 'No email'}</span>
                    <span>|</span>
                    <span>{user.role}</span>
                    <span>|</span>
                    <span>{formatDateTime(user.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={`${order.source}-${order.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{order.customer}</p>
                    <Badge variant="outline">{order.source === 'store' ? 'Store' : 'Direct'}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{ghanaCurrency(order.amount)}</span>
                    <span>|</span>
                    <span className="capitalize">{order.status}</span>
                    <span>|</span>
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{tx.type}</p>
                    <Badge variant={tx.status === 'success' ? 'default' : 'outline'}>{tx.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{ghanaCurrency(Number(tx.amount || 0))}</span>
                    <span>|</span>
                    <span>{tx.reference}</span>
                    <span>|</span>
                    <span>{formatDateTime(tx.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
