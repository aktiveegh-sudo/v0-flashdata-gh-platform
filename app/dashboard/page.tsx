'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Package,
  ArrowUpRight,
  Wifi,
  Wallet,
  Sparkles,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WalletCard } from '@/components/wallet-card'
import { StatsCard } from '@/components/stats-card'
import { QuickActions } from '@/components/quick-actions'
import { ProfileBanner } from '@/components/dashboard/profile-banner'
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner'
import { ReferralCard } from '@/components/dashboard/referral-card'
import { StreakWidget } from '@/components/dashboard/streak-widget'
import { useAuthStore, useWalletStore, useTransactionStore } from '@/lib/store'
import { getDashboardAuthHeaders } from '@/lib/dashboard/client-auth'
import { format } from 'date-fns'

const networkLogos: Record<string, { bg: string; text: string; gradient: string }> = {
  MTN: { bg: 'bg-yellow-500', text: 'text-black', gradient: 'from-yellow-400 to-yellow-600' },
  'Airtel-Tigo': { bg: 'bg-red-500', text: 'text-white', gradient: 'from-red-500 to-red-700' },
  Telecel: { bg: 'bg-blue-600', text: 'text-white', gradient: 'from-blue-500 to-blue-700' },
}

type StoreOrderPreview = {
  id: string
  customer_name: string
  customer_phone: string
  total_price: number
  status: 'pending' | 'processing' | 'delivered' | 'declined'
  created_at: string
  item_type: 'data' | 'service'
  data_packages: { network: string; amount: string; name: string } | null
  online_services: { name: string; category: string } | null
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const { balance } = useWalletStore()
  const { transactions } = useTransactionStore()
  const [storeOrders, setStoreOrders] = useState<StoreOrderPreview[]>([])

  useEffect(() => {
    const loadStoreOrders = async () => {
      const response = await fetch('/api/dashboard/store-orders', {
        method: 'GET',
        headers: await getDashboardAuthHeaders(false),
        credentials: 'include',
      })

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: { orders?: StoreOrderPreview[] } }
        | null

      if (!response.ok || !result?.success) {
        setStoreOrders([])
        return
      }

      setStoreOrders((result.data?.orders || []).slice(0, 5))
    }

    void loadStoreOrders()
  }, [])

  const recentTransactions = transactions.slice(0, 5)
  const successfulTransactions = transactions.filter((tx) => tx.status === 'success')
  const pendingTransactions = transactions.filter((tx) => tx.status === 'pending')

  const totalDeposited = successfulTransactions
    .filter((tx) => tx.type === 'wallet')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const dataOrders = successfulTransactions.filter((tx) => tx.type !== 'wallet').length + storeOrders.length
  const salesVolume = successfulTransactions
    .filter((tx) => tx.type !== 'wallet')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const pointsEarned = successfulTransactions.length * 10

  const stats = [
    {
      label: 'Data Orders',
      value: String(dataOrders),
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      trend: { value: dataOrders, isPositive: true },
      delay: 0,
    },
    {
      label: 'Total Deposited',
      value: `GHc ${totalDeposited.toFixed(2)}`,
      icon: Wallet,
      gradient: 'from-emerald-500 to-green-600',
      trend: { value: 0, isPositive: true },
      delay: 0.05,
    },
    {
      label: 'FlashPoints',
      value: String(pointsEarned),
      icon: Sparkles,
      gradient: 'from-amber-400 to-orange-500',
      trend: { value: pointsEarned, isPositive: true },
      delay: 0.1,
    },
    {
      label: 'Sales Volume',
      value: `GHc ${salesVolume.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-sky-500 to-blue-600',
      delay: 0.15,
    },
  ]

  const networkRoutes: Record<string, string> = {
    MTN: '/dashboard/buy-data/mtn',
    'Airtel-Tigo': '/dashboard/buy-data/airteltigo',
    Telecel: '/dashboard/buy-data/telecel',
  }

  const networks = [
    { name: 'MTN', gradient: 'from-yellow-400 to-amber-500', textColor: 'text-black', accent: 'shadow-yellow-400/30' },
    { name: 'Airtel-Tigo', gradient: 'from-red-500 to-rose-600', textColor: 'text-white', accent: 'shadow-red-500/30' },
    { name: 'Telecel', gradient: 'from-blue-500 to-blue-700', textColor: 'text-white', accent: 'shadow-blue-500/30' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <AnnouncementBanner />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ProfileBanner />
      </motion.div>

      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-white p-6 shadow-sm dark:border-amber-400/20 dark:bg-[#0a110d]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                {greeting}
              </p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white lg:text-3xl">
                {user?.name?.split(' ')[0] || 'Agent'}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
                What would you like to do today?
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
              <Link href="/dashboard/buy-data/mtn">
                <Button size="sm" className="gap-2 rounded-full bg-amber-400 text-black hover:bg-amber-300">
                  <Wifi className="h-4 w-4" />
                  Buy Data
                </Button>
              </Link>
              <Link href="/dashboard/wallet">
                <Button size="sm" variant="outline" className="gap-2 rounded-full">
                  Top Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet Card */}
      <motion.div variants={itemVariants}>
        <WalletCard balance={balance} />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatsCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            trend={stat.trend}
            delay={stat.delay}
          />
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="console-section-label">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <StreakWidget />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ReferralCard />
        </motion.div>
      </div>

      {/* Quick Buy Networks & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Buy by Network */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 console-section-label">
                <Wifi className="h-4 w-4 text-[#f4c532]" />
                Buy Data By Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {networks.map((network) => (
                  <Link
                    key={network.name}
                    href={networkRoutes[network.name] || '/dashboard/buy-data/mtn'}
                  >
                    <motion.div
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${network.gradient} p-4 shadow-lg ${network.accent} transition-shadow hover:shadow-xl`}
                    >
                      <span className={`text-sm font-bold ${network.textColor} leading-tight`}>
                        {network.name}
                      </span>
                      <span className={`text-[10px] ${network.textColor} opacity-80 mt-0.5`}>
                        Buy Data
                      </span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 console-section-label">
                <Wallet className="h-4 w-4 text-[#f4c532]" />
                Recent Activity
              </CardTitle>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[#f4c532] text-xs hover:bg-[#f4c532]/10 hover:text-[#ffdc67]">
                  View All
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                ) : (
                  recentTransactions.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-white/8 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center gap-3">
                        {tx.network ? (
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold shadow-sm ${
                              networkLogos[tx.network]?.gradient
                                ? `bg-gradient-to-br ${networkLogos[tx.network].gradient}`
                                : 'bg-primary/10'
                            } ${networkLogos[tx.network]?.text || 'text-primary-foreground'}`}
                          >
                            {tx.network.slice(0, 3)}
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium leading-tight text-foreground">
                            {tx.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(tx.date), 'MMM d - h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            tx.type === 'wallet'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {tx.type === 'wallet' ? '+' : '-'}GHc {tx.amount.toFixed(2)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            tx.status === 'success'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : tx.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 console-section-label">
              <ShoppingCart className="h-4 w-4 text-[#f4c532]" />
              Recent Shop Orders
            </CardTitle>
            <Link href="/dashboard/store-orders">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-[#f4c532] text-xs hover:bg-[#f4c532]/10 hover:text-[#ffdc67]">
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {storeOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No shop orders yet. Share your store link to start receiving orders.
              </p>
            ) : (
              <div className="space-y-2">
                {storeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.item_type === 'service'
                          ? order.online_services?.name || 'Service order'
                          : `${order.data_packages?.amount || ''} ${order.data_packages?.network || 'Data'}`.trim()}
                        {' ? '}
                        {order.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">GHc {Number(order.total_price).toFixed(2)}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
