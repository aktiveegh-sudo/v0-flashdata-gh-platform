'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Wallet,
  TrendingUp,
  Package,
  ArrowUpRight,
  Plus,
  Wifi,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, useWalletStore, useTransactionStore } from '@/lib/store'
import { format } from 'date-fns'

const networkLogos: Record<string, { bg: string; text: string }> = {
  MTN: { bg: 'bg-yellow-500', text: 'text-black' },
  'Airtel-Tigo': { bg: 'bg-red-500', text: 'text-white' },
  Telecel: { bg: 'bg-blue-600', text: 'text-white' },
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const { balance } = useWalletStore()
  const { transactions } = useTransactionStore()

  const recentTransactions = transactions.slice(0, 5)

  const stats = [
    {
      label: 'Total Data Bought',
      value: '45.5 GB',
      change: '+12%',
      icon: Package,
    },
    {
      label: 'This Month Savings',
      value: 'GH₵ 32.50',
      change: '+8%',
      icon: TrendingUp,
    },
    {
      label: 'Active Packages',
      value: '3',
      change: '0%',
      icon: Wifi,
    },
  ]

  const networks = [
    { name: 'MTN', color: 'bg-yellow-500', textColor: 'text-black' },
    { name: 'Airtel-Tigo', color: 'bg-red-500', textColor: 'text-white' },
    { name: 'Telecel', color: 'bg-blue-600', textColor: 'text-white' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </motion.div>

      {/* Wallet Balance Card */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary/80">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">
                  Wallet Balance
                </p>
                <p className="text-3xl font-bold text-primary-foreground lg:text-4xl">
                  GH₵ {balance.toFixed(2)}
                </p>
              </div>
              <Link href="/dashboard/wallet">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 bg-white/20 text-primary-foreground hover:bg-white/30"
                >
                  <Plus className="h-4 w-4" />
                  Fund Wallet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
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
      </motion.div>

      {/* Quick Buy & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Buy Data */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Quick Buy Data
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
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex flex-col items-center justify-center rounded-xl ${network.color} p-4 transition-shadow hover:shadow-lg`}
                    >
                      <span className={`text-lg font-bold ${network.textColor}`}>
                        {network.name}
                      </span>
                      <span className={`text-xs ${network.textColor}/80`}>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Recent Transactions
              </CardTitle>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No transactions yet
                  </p>
                ) : (
                  recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {tx.network && (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${
                              networkLogos[tx.network]?.bg || 'bg-primary'
                            } ${networkLogos[tx.network]?.text || 'text-primary-foreground'}`}
                          >
                            {tx.network.slice(0, 3)}
                          </div>
                        )}
                        {!tx.network && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {tx.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.date), 'MMM d, yyyy · h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            tx.type === 'wallet'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-foreground'
                          }`}
                        >
                          {tx.type === 'wallet' ? '+' : '-'}GH₵ {tx.amount.toFixed(2)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={
                            tx.status === 'success'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : tx.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
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
