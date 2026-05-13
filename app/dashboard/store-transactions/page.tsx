'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Search, Filter, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'

const storeTransactions = [
  { id: '1', customer: 'Kwame Asante', network: 'MTN', dataAmount: '2GB', amount: 10.00, profit: 1.50, date: '2024-01-15T10:30:00' },
  { id: '2', customer: 'Ama Serwaa', network: 'Airtel-Tigo', dataAmount: '1GB', amount: 5.00, profit: 1.00, date: '2024-01-15T09:15:00' },
  { id: '3', customer: 'Kofi Mensah', network: 'MTN', dataAmount: '5GB', amount: 25.00, profit: 5.00, date: '2024-01-14T16:45:00' },
  { id: '4', customer: 'Yaa Asantewaa', network: 'Telecel', dataAmount: '2GB', amount: 9.00, profit: 1.50, date: '2024-01-14T14:20:00' },
  { id: '5', customer: 'Akua Mensah', network: 'MTN', dataAmount: '10GB', amount: 40.00, profit: 5.00, date: '2024-01-13T11:00:00' },
  { id: '6', customer: 'Kwesi Boateng', network: 'Airtel-Tigo', dataAmount: '5GB', amount: 20.00, profit: 3.00, date: '2024-01-13T09:30:00' },
  { id: '7', customer: 'Abena Poku', network: 'MTN', dataAmount: '1GB', amount: 5.00, profit: 0.50, date: '2024-01-12T15:20:00' },
  { id: '8', customer: 'Kofi Annan', network: 'Telecel', dataAmount: '3GB', amount: 12.00, profit: 2.00, date: '2024-01-12T10:45:00' },
]

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500 text-black',
  'Airtel-Tigo': 'bg-red-500 text-white',
  Telecel: 'bg-blue-600 text-white',
}

export default function StoreTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNetwork, setFilterNetwork] = useState('all')

  const filteredTransactions = storeTransactions.filter((tx) => {
    const matchesSearch = tx.customer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesNetwork = filterNetwork === 'all' || tx.network === filterNetwork
    return matchesSearch && matchesNetwork
  })

  const totalEarnings = storeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const totalProfit = storeTransactions.reduce((sum, tx) => sum + tx.profit, 0)
  const todaysEarnings = storeTransactions
    .filter((tx) => new Date(tx.date).toDateString() === new Date().toDateString())
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Transactions</h1>
        <p className="text-muted-foreground">Track your store earnings and sales</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                +15%
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">GH₵ {totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                +12%
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">GH₵ {totalProfit.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Profit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">GH₵ {todaysEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Today&apos;s Earnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Earnings Log
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:w-48"
                />
              </div>
              <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                <SelectTrigger className="w-32">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  <SelectItem value="MTN">MTN</SelectItem>
                  <SelectItem value="Airtel-Tigo">Airtel-Tigo</SelectItem>
                  <SelectItem value="Telecel">Telecel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {tx.customer.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.customer}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge className={networkColors[tx.network] || 'bg-primary'} variant="secondary">
                          {tx.network}
                        </Badge>
                        <span>{tx.dataAmount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">GH₵ {tx.amount.toFixed(2)}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +GH₵ {tx.profit.toFixed(2)} profit
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.date), 'MMM d, h:mm a')}
                    </p>
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
