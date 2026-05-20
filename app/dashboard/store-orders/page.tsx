'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Check, X, Clock, Phone, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type StoreOrder = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  customer_phone: string
  quantity: number
  total_price: number
  status: 'pending' | 'accepted' | 'declined' | 'completed'
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
      toast.error('Set up your store in Store Settings first')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.client
      .from('agent_store_orders')
      .select('id,item_type,customer_name,customer_phone,quantity,total_price,status,created_at,data_packages(network,name,amount),online_services(name,category)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setOrders((data as StoreOrder[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadOrders()
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
  const acceptedOrders = orders.filter((o) => o.status === 'accepted')
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'declined')
  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)

  const statusClass = (status: StoreOrder['status']) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (status === 'accepted') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
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
      className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
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
              onClick={() => void updateStatus(order.id, 'accepted')}
              disabled={updatingId === order.id}
            >
              {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
          </div>
        ) : null}

        {order.status === 'accepted' ? (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => void updateStatus(order.id, 'completed')}
            disabled={updatingId === order.id}
          >
            {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark Complete
          </Button>
        ) : null}
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading store orders...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Shop Orders</h1>
        <p className="text-muted-foreground">Review and manage incoming customer orders from your shop link</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{acceptedOrders.length}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {completedOrders.filter((o) => o.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              All Store Orders ({orders.length})
            </CardTitle>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No orders found for this filter</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
