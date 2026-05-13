'use client'

import { motion } from 'framer-motion'
import {
  Store,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowUpRight,
  Package,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const salesData = [
  { name: 'Mon', sales: 240 },
  { name: 'Tue', sales: 300 },
  { name: 'Wed', sales: 450 },
  { name: 'Thu', sales: 380 },
  { name: 'Fri', sales: 520 },
  { name: 'Sat', sales: 600 },
  { name: 'Sun', sales: 480 },
]

const ordersByNetwork = [
  { name: 'MTN', orders: 45 },
  { name: 'Airtel-Tigo', orders: 28 },
  { name: 'Telecel', orders: 22 },
]

const recentOrders = [
  { id: 1, customer: 'Kwame Asante', network: 'MTN', amount: '2GB', price: 10.00, status: 'completed' },
  { id: 2, customer: 'Ama Serwaa', network: 'Airtel-Tigo', amount: '1GB', price: 5.00, status: 'pending' },
  { id: 3, customer: 'Kofi Mensah', network: 'MTN', amount: '5GB', price: 25.00, status: 'completed' },
  { id: 4, customer: 'Yaa Asantewaa', network: 'Telecel', amount: '2GB', price: 9.00, status: 'completed' },
]

export default function MyStorePage() {
  const stats = [
    {
      label: 'Total Earnings',
      value: 'GH₵ 1,245.50',
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Orders Today',
      value: '23',
      change: '+8%',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Store Visitors',
      value: '156',
      change: '+15%',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Active Packages',
      value: '12',
      change: '0%',
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">My Store</h1>
        <p className="text-muted-foreground">Manage your reseller store and track performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <Badge
                  variant="secondary"
                  className={
                    stat.change.startsWith('+')
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {stat.change}
                </Badge>
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
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {order.customer.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{order.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.amount} {order.network} Data
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">GH₵ {order.price.toFixed(2)}</p>
                  <Badge
                    variant="secondary"
                    className={
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
