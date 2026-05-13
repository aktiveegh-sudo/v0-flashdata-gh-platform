'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Check, X, Clock, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStoreOrderStore, useLoadingStore } from '@/lib/store'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500 text-black',
  'Airtel-Tigo': 'bg-red-500 text-white',
  Telecel: 'bg-blue-600 text-white',
}

export default function StoreOrdersPage() {
  const { orders, updateOrderStatus } = useStoreOrderStore()
  const { setLoading } = useLoadingStore()

  const handleAccept = async (orderId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    updateOrderStatus(orderId, 'accepted')
    setLoading(false)
    toast.success('Order accepted! Processing data transfer...')
  }

  const handleDecline = async (orderId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    updateOrderStatus(orderId, 'declined')
    setLoading(false)
    toast.error('Order declined')
  }

  const handleComplete = async (orderId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    updateOrderStatus(orderId, 'completed')
    setLoading(false)
    toast.success('Order completed successfully!')
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const acceptedOrders = orders.filter((o) => o.status === 'accepted')
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'declined')

  const OrderCard = ({ order }: { order: typeof orders[0] }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {order.customerName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-foreground">{order.customerName}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {order.customerPhone}
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={
            order.status === 'completed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : order.status === 'pending'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : order.status === 'accepted'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }
        >
          {order.status}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-3">
          <Badge className={networkColors[order.network] || 'bg-primary'}>
            {order.network}
          </Badge>
          <span className="font-semibold text-foreground">{order.dataAmount}</span>
        </div>
        <span className="text-lg font-bold text-primary">GH₵ {order.amount.toFixed(2)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{format(new Date(order.date), 'MMM d, yyyy · h:mm a')}</span>
        
        {order.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleDecline(order.id)}
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button size="sm" className="gap-1" onClick={() => handleAccept(order.id)}>
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        )}

        {order.status === 'accepted' && (
          <Button size="sm" className="gap-1" onClick={() => handleComplete(order.id)}>
            <Check className="h-4 w-4" />
            Mark Complete
          </Button>
        )}
      </div>
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Orders</h1>
        <p className="text-muted-foreground">Manage incoming customer orders</p>
      </div>

      {/* Stats */}
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

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Orders ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Orders */}
      {acceptedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Processing ({acceptedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acceptedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Order History ({completedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedOrders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No completed orders yet</p>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
