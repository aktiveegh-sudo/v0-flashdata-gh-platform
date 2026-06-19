'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Check, X, Clock, Phone, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { getDashboardAuthHeaders } from '@/lib/dashboard/client-auth'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type StoreOrder = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  customer_phone: string
  quantity: number
  total_price: number
  status: 'pending' | 'processing' | 'delivered' | 'declined'
  created_at: string
  data_packages: {
    network: string
    name: string
    amount: string
  } | null
  online_services: {
    name: string
    category: string
  } | null
}

export default function StoreOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | StoreOrder['status']>('all')

  const loadOrders = async () => {
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
          error?: string
          data?: { store?: { id: string } | null; orders?: StoreOrder[] }
        }
      | null

    if (!response.ok || !result?.success) {
      toast.error(result?.error || 'Unable to load store orders')
      setOrders([])
      setLoading(false)
      return
    }

    if (!result.data?.store) {
      toast.error('Set up your store in Store Settings first')
      setOrders([])
      setLoading(false)
      return
    }

    setOrders((result.data.orders as StoreOrder[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadOrders()

    const channel = supabase.client
      .channel(`dashboard-store-orders-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_orders' }, () => {
        void loadOrders()
      })
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const updateStatus = async (orderId: string, status: StoreOrder['status']) => {
    setUpdatingId(orderId)

    const { error } = await supabase.client
      .from('agent_store_orders')
      .update({ status })
      .eq('id', orderId)

    setUpdatingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)))
    toast.success(`Order ${status}`)
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const processingOrders = orders.filter((o) => o.status === 'processing')
  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'declined')
  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)

  const statusClass = (status: StoreOrder['status']) => {
    if (status === 'delivered') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (status === 'processing') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const itemTitle = (order: StoreOrder) => {
    if (order.item_type === 'data') {
      return `${order.data_packages?.network || ''} ${order.data_packages?.name || 'Data'} (${order.data_packages?.amount || ''})`
    }

    return order.online_services?.name || 'Service Order'
  }

  const OrderCard = ({ order }: { order: StoreOrder }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-[#0a0a0f]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {order.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{order.customer_name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {order.customer_phone}
            </div>
          </div>
        </div>
        <Badge variant="secondary" className={statusClass(order.status)}>
          {order.status}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <div>
          <p className="font-semibold text-foreground">{itemTitle(order)}</p>
          <p className="text-sm text-muted-foreground">Qty: {order.quantity}</p>
        </div>
        <span className="text-lg font-bold text-primary">GHc {Number(order.total_price).toFixed(2)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{format(new Date(order.created_at), 'MMM d, yyyy - h:mm a')}</span>

        {order.status === 'pending' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => void updateStatus(order.id, 'declined')}
              disabled={updatingId === order.id}
            >
              {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Decline
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => void updateStatus(order.id, 'processing')}
              disabled={updatingId === order.id}
            >
              {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
          </div>
        ) : null}

        {order.status === 'processing' ? (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => void updateStatus(order.id, 'delivered')}
            disabled={updatingId === order.id}
          >
            {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark Complete
          </Button>
        ) : null}
      </div>
    </motion.div>
  )

  if (loading) return <FlashPageLoader />

  return (
    <DashboardPageShell
      title="Shop Orders"
      description="Review and manage incoming customer orders from your shop link."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Pending" value={String(pendingOrders.length)} icon={Clock} />
          <DashboardStatCard label="Processing" value={String(processingOrders.length)} icon={ShoppingCart} />
          <DashboardStatCard
            label="Delivered"
            value={String(completedOrders.filter((o) => o.status === 'delivered').length)}
            icon={Check}
          />
        </DashboardStatGrid>
      }
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <DashboardPanel
        title={`All Store Orders (${orders.length})`}
        action={
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        }
      >
          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No orders found for this filter</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
      </DashboardPanel>
    </motion.div>
    </DashboardPageShell>
  )
}
