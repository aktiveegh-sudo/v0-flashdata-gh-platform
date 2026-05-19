'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Plus,
  CreditCard,
  Smartphone,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import { startPaystackCheckout } from '@/lib/paystack/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const paymentMethods = [
  { id: 'mtn-momo', name: 'MTN Mobile Money', icon: '📱', color: 'bg-yellow-500' },
  { id: 'telecel-cash', name: 'Telecel Cash', icon: '📱', color: 'bg-blue-500' },
  { id: 'card', name: 'Debit/Credit Card', icon: '💳', color: 'bg-purple-500' },
]

export default function WalletPage() {
  const { balance } = useWalletStore()
  const { transactions } = useTransactionStore()
  const { setLoading } = useLoadingStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [initializing, setInitializing] = useState(false)

  const walletTransactions = transactions.filter(
    (tx) =>
      tx.type === 'wallet' ||
      tx.type === 'data' ||
      tx.type === 'airtime' ||
      tx.type === 'withdrawal'
  )

  const filteredTransactions = walletTransactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalFunded = walletTransactions
    .filter((tx) => tx.type === 'wallet' && tx.status === 'success')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalSpent = walletTransactions
    .filter((tx) => tx.type !== 'wallet' && tx.status === 'success')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const dataPurchases = walletTransactions.filter((tx) => tx.type === 'data' && tx.status === 'success').length
  const topupCount = walletTransactions.filter((tx) => tx.type === 'wallet').length

  const handleAddMoney = async () => {
    if (!amount || !paymentMethod) {
      toast.error('Please fill in all fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if ((paymentMethod === 'mtn-momo' || paymentMethod === 'telecel-cash') && !phoneNumber.trim()) {
      toast.error('Phone number is required for mobile money payments')
      return
    }

    setLoading(true)
    setInitializing(true)

    try {
      await startPaystackCheckout({
        flow: 'wallet_topup',
        amount: amountNum,
        paymentMethod,
        redirectPath: '/dashboard/wallet',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start Paystack payment')
      setLoading(false)
      setInitializing(false)
      return
    }
  }

  const quickAmounts = [10, 20, 50, 100, 200, 500]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Wallet</h1>
          <p className="text-muted-foreground">Manage your wallet and view transactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Money
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Money to Wallet</DialogTitle>
              <DialogDescription>
                Choose your preferred payment method and enter the amount.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GH₵)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(amt.toString())}
                      className={amount === amt.toString() ? 'border-primary bg-primary/10' : ''}
                    >
                      GH₵ {amt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                        paymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${method.color} text-lg`}
                      >
                        {method.icon}
                      </div>
                      <span className="font-medium">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number (for mobile money) */}
              {(paymentMethod === 'mtn-momo' || paymentMethod === 'telecel-cash') && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+233 24 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              )}

              <Button className="w-full" onClick={handleAddMoney} disabled={initializing}>
                {initializing ? 'Redirecting to Paystack...' : null}
                {!initializing ? `Add GH₵ ${amount || '0.00'} to Wallet` : null}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
              <Wallet className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">
                Current Balance
              </p>
              <p className="text-3xl font-bold text-primary-foreground lg:text-4xl">
                GH₵ {balance.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Funded</p>
              <p className="text-xl font-bold text-foreground">GHc {totalFunded.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold text-foreground">GHc {totalSpent.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Purchases</p>
              <p className="text-xl font-bold text-foreground">{dataPurchases}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top-ups</p>
              <p className="text-xl font-bold text-foreground">{topupCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:w-64"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="wallet">Top-ups</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
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
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        tx.type === 'wallet'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : tx.type === 'withdrawal'
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : 'bg-primary/10'
                      }`}
                    >
                      {tx.type === 'wallet' ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : tx.type === 'withdrawal' ? (
                        <ArrowUpRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.reference} · {format(new Date(tx.date), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
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
  )
}
