'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp,
  Package,
  ArrowUpRight,
  Wifi,
  Wallet,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WalletCard } from '@/components/wallet-card'
import { StatsCard } from '@/components/stats-card'
import { QuickActions } from '@/components/quick-actions'
import { useAuthStore, useWalletStore, useTransactionStore } from '@/lib/store'
import { format } from 'date-fns'

const networkLogos: Record<string, { bg: string; text: string; gradient: string }> = {
  MTN: { bg: 'bg-yellow-500', text: 'text-black', gradient: 'from-yellow-400 to-yellow-600' },
  'Airtel-Tigo': { bg: 'bg-red-500', text: 'text-white', gradient: 'from-red-500 to-red-700' },
  Telecel: { bg: 'bg-blue-600', text: 'text-white', gradient: 'from-blue-500 to-blue-700' },
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const { balance } = useWalletStore()
  const { transactions } = useTransactionStore()

  const recentTransactions = transactions.slice(0, 5)
  const successfulTransactions = transactions.filter((tx) => tx.status === 'success')
  const pendingTransactions = transactions.filter((tx) => tx.status === 'pending')
  const thisMonthSpend = successfulTransactions
    .filter((tx) => tx.type !== 'wallet' && new Date(tx.date).getMonth() === new Date().getMonth())
    .reduce((sum, tx) => sum + tx.amount, 0)

  const stats = [
    {
      label: 'Completed Orders',
      value: String(successfulTransactions.length),
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      trend: { value: successfulTransactions.length, isPositive: true },
      delay: 0,
    },
    {
      label: 'Spent This Month',
      value: `GHc ${thisMonthSpend.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-600',
      trend: { value: 0, isPositive: true },
      delay: 0.05,
    },
    {
      label: 'In Progress',
      value: String(pendingTransactions.length),
      icon: Wifi,
      gradient: 'from-sky-500 to-blue-600',
      delay: 0.1,
    },
  ]

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
          {/* Decorative blobs */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-white/5 blur-xl" />
          <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground/70">
                <Sparkles className="h-3.5 w-3.5" />
                {greeting}
              </p>
              <h1 className="text-2xl font-bold lg:text-3xl">
                {user?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/70">
                Here is a quick look at your account today.
              </p>
            </div>
            <div className="mt-3 sm:mt-0">
              <Link href="/dashboard/buy-data">
                <Button size="sm" className="gap-2 bg-white/20 text-primary-foreground hover:bg-white/30 border-white/20 border">
                  <Wifi className="h-4 w-4" />
                  Buy Data
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
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
            <CardTitle className="text-base font-semibold">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Buy Networks & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Buy by Network */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wifi className="h-4 w-4 text-primary" />
                Pick Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {networks.map((network) => (
                  <Link
                    key={network.name}
                    href={`/dashboard/buy-data?network=${network.name.toLowerCase()}`}
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
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-primary h-7 text-xs">
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
                      className="flex items-center justify-between rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/70"
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
                          <p className="text-xs text-muted-foreground">
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
    </motion.div>
  )
}
