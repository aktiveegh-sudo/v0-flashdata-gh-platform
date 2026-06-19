'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Store,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowUpRight,
  Package,
  Copy,
  Link2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { supabase } from '@/lib/supabase/client'
import { getDashboardAuthHeaders } from '@/lib/dashboard/client-auth'
import { getStorePublicUrl } from '@/lib/store-domain'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

type StoreOrderRow = {
  id: string
  customer_name: string
  customer_phone: string
  total_price: number
  status: 'pending' | 'processing' | 'delivered' | 'declined'
  created_at: string
  data_packages: {
    network: string
    amount: string
  } | null
}

export default function MyStorePage() {
  const [storeSlug, setStoreSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<StoreOrderRow[]>([])
  const [activePackages, setActivePackages] = useState(0)

  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true)
      await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)

      const response = await fetch('/api/dashboard/store-orders', {
        method: 'GET',
        headers: await getDashboardAuthHeaders(false),
        credentials: 'include',
      })

      const result = (await response.json().catch(() => null)) as
        | {
            success?: boolean
            data?: { store?: { id: string; slug: string } | null; orders?: StoreOrderRow[] }
          }
        | null

      if (!response.ok || !result?.success || !result.data?.store) {
        setStoreSlug('')
        setOrders([])
        setActivePackages(0)
        setLoading(false)
        return
      }

      setStoreSlug(result.data.store.slug)

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setLoading(false)
        return
      }

      const { count: packageCount } = await supabase.client
        .from('agent_store_packages')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', result.data.store.id)
        .eq('is_active', true)

      setOrders((result.data.orders as StoreOrderRow[]) || [])
      setActivePackages(packageCount || 0)
      setLoading(false)
    }

    void loadStoreData()

    const channel = supabase.client
      .channel(`dashboard-my-store-orders-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_orders' }, () => {
        void loadStoreData()
      })
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const publicLink = useMemo(() => {
    if (!storeSlug) {
      return ''
    }

    return getStorePublicUrl(storeSlug)
  }, [storeSlug])

  const copyStoreLink = async () => {
    if (!publicLink) {
      toast.error('Set up your store slug in Store Settings first')
      return
    }

    await navigator.clipboard.writeText(publicLink)
    toast.success('Store link copied')
  }

  const totalEarnings = orders.reduce((sum, order) => sum + Number(order.total_price), 0)
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === new Date().toDateString()).length
  const uniqueVisitors = new Set(orders.map((order) => order.customer_phone || order.customer_name)).size
  const recentOrders = orders.slice(0, 5)

  const salesData = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const map = new Map<string, number>()

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      map.set(date.toDateString(), 0)
    }

    for (const order of orders) {
      const key = new Date(order.created_at).toDateString()
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + Number(order.total_price))
      }
    }

    return Array.from(map.entries()).map(([day, sales]) => ({
      name: labels[new Date(day).getDay()],
      sales,
    }))
  }, [orders])

  const ordersByNetwork = useMemo(() => {
    const networkMap = new Map<string, number>()
    for (const order of orders) {
      const network = order.data_packages?.network || 'Other'
      networkMap.set(network, (networkMap.get(network) || 0) + 1)
    }

    return Array.from(networkMap.entries()).map(([name, count]) => ({ name, orders: count }))
  }, [orders])

  if (loading) return <FlashPageLoader />

  return (
    <DashboardPageShell
      title="My Shop"
      description="Track sales, orders, and your public shop performance."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Total Earnings" value={`GHc ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
          <DashboardStatCard label="Orders Today" value={String(todayOrders)} icon={ShoppingCart} />
          <DashboardStatCard label="Store Visitors" value={String(uniqueVisitors)} icon={Users} />
          <DashboardStatCard label="Active Packages" value={String(activePackages)} icon={Package} />
        </DashboardStatGrid>
      }
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <DashboardPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <Link2 className="h-4 w-4 text-amber-500" />
              Your Public Store Link
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {publicLink || 'Create your store slug in Store Settings to get your link'}
            </p>
          </div>
          <Button onClick={copyStoreLink} className="gap-2" variant="secondary">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </DashboardPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Weekly Sales">
          <div className="flex items-center gap-2 mb-4 -mt-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </DashboardPanel>

        <DashboardPanel title="Orders by Network">
          <div className="flex items-center gap-2 mb-4 -mt-2">
            <Store className="h-4 w-4 text-amber-500" />
          </div>
          <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByNetwork}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent Orders"
        action={
          <a
            href="/dashboard/store-orders"
            className="flex items-center gap-1 text-sm text-amber-600 hover:underline dark:text-amber-400"
          >
            View All
            <ArrowUpRight className="h-4 w-4" />
          </a>
        }
      >
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-gray-500 dark:text-white/50">No store orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 text-sm font-bold text-amber-600 dark:text-amber-400">
                      {order.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                      <p className="text-sm text-gray-500 dark:text-white/55">
                        {order.data_packages?.amount || '-'} {order.data_packages?.network || 'Order'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">GHc {Number(order.total_price).toFixed(2)}</p>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'declined'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : order.status === 'processing'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
      </DashboardPanel>
    </motion.div>
    </DashboardPageShell>
  )
}
