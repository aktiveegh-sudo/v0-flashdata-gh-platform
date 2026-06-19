'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Search, Filter, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type StoreTransactionRow = {
  id: string
  customer_name: string
  customer_phone: string
  total_price: number
  created_at: string
  status: 'pending' | 'processing' | 'delivered' | 'declined'
  data_packages: {
    network: string
    amount: string
  } | null
}

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500 text-black',
  'Airtel-Tigo': 'bg-red-500 text-white',
  Telecel: 'bg-blue-600 text-white',
}

export default function StoreTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [storeTransactions, setStoreTransactions] = useState<StoreTransactionRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNetwork, setFilterNetwork] = useState('all')

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true)
      await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        toast.error('Please login again')
        setLoading(false)
        return
      }

      const { data: store, error: storeError } = await supabase.client
        .from('agent_stores')
        .select('id')
        .eq('agent_id', authData.user.id)
        .maybeSingle()

      if (storeError) {
        toast.error(storeError.message)
        setLoading(false)
        return
      }

      if (!store) {
        setStoreTransactions([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase.client
        .from('agent_store_orders')
        .select('id,customer_name,customer_phone,total_price,created_at,status,data_packages(network,amount)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      setStoreTransactions((data as StoreTransactionRow[]) || [])
      setLoading(false)
    }

    void loadTransactions()
  }, [])

  const filteredTransactions = storeTransactions.filter((tx) => {
    const matchesSearch = tx.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesNetwork = filterNetwork === 'all' || tx.data_packages?.network === filterNetwork
    return matchesSearch && matchesNetwork
  })

  const totalEarnings = storeTransactions.reduce((sum, tx) => sum + Number(tx.total_price), 0)
  const totalProfit = 0
  const todaysEarnings = storeTransactions
    .filter((tx) => new Date(tx.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, tx) => sum + tx.total_price, 0)

  if (loading) return <FlashPageLoader />

  return (
    <DashboardPageShell
      title="Shop Payments"
      description="Track your earnings and customer payments."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Total Earnings" value={`GHc ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
          <DashboardStatCard label="Profit" value={`GHc ${totalProfit.toFixed(2)}`} hint="Calculation pending" icon={TrendingUp} />
          <DashboardStatCard label="Today's Earnings" value={`GHc ${todaysEarnings.toFixed(2)}`} icon={ArrowUpRight} />
        </DashboardStatGrid>
      }
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <DashboardPanel
        title="Earnings Log"
        action={
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
        }
      >
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {tx.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.customer_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge className={networkColors[tx.data_packages?.network || ''] || 'bg-primary'} variant="secondary">
                          {tx.data_packages?.network || 'N/A'}
                        </Badge>
                        <span>{tx.data_packages?.amount || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">GHc {Number(tx.total_price).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{tx.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                    </p>
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
