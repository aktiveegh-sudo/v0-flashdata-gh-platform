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
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
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
  status: 'pending' | 'accepted' | 'declined' | 'completed'
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

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setLoading(false)
        return
      }

      const { data: store } = await supabase.client
        .from('agent_stores')
        .select('id,slug')
        .eq('agent_id', authData.user.id)
        .maybeSingle()

      if (!store) {
        setStoreSlug('')
        setOrders([])
        setActivePackages(0)
        setLoading(false)
        return
      }

      setStoreSlug(store.slug)

      const [{ data: orderRows }, { count: packageCount }] = await Promise.all([
        supabase.client
          .from('agent_store_orders')
          .select('id,customer_name,customer_phone,total_price,status,created_at,data_packages(network,amount)')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false }),
        supabase.client
          .from('agent_store_packages')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('is_active', true),
      ])

      setOrders((orderRows as StoreOrderRow[]) || [])
      setActivePackages(packageCount || 0)
      setLoading(false)
    }

    void loadStoreData()
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

  const stats = [
    {
      label: 'Total Earnings',
      value: `GHc ${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Orders Today',
      value: String(todayOrders),
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Store Visitors',
      value: String(uniqueVisitors),
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Active Packages',
      value: String(activePackages),
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading store dashboard...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">My Shop</h1>
        <p className="text-muted-foreground">Track sales, orders, and your public shop performance</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-primary" />
              Your Public Store Link
            </p>
            <p className="text-sm text-primary">
              {publicLink || 'Create your store slug in Store Settings to get your link'}
            </p>
          </div>
          <Button onClick={copyStoreLink} className="gap-2" variant="secondary">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">Live</Badge>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Orders by Network */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Orders by Network
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Recent Orders
          </CardTitle>
          <a
            href="/dashboard/store-orders"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View All
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No store orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {order.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.data_packages?.amount || '-'} {order.data_packages?.network || 'Order'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">GHc {Number(order.total_price).toFixed(2)}</p>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'declined'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
        </CardContent>
      </Card>
    </motion.div>
  )
}
