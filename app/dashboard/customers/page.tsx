'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, Phone, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getDashboardAuthHeaders } from '@/lib/dashboard/client-auth'
import { format } from 'date-fns'

type StoreOrder = {
  id: string
  customer_name: string
  customer_phone: string
  total_price: number
  status: string
  created_at: string
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/dashboard/store-orders', {
        method: 'GET',
        headers: await getDashboardAuthHeaders(false),
        credentials: 'include',
      })
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: { orders?: StoreOrder[] } }
        | null
      setOrders(result?.data?.orders || [])
      setLoading(false)
    }
    void load()
  }, [])

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orders: number; spent: number; lastOrder: string }>()
    for (const order of orders) {
      const key = order.customer_phone
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          name: order.customer_name,
          phone: order.customer_phone,
          orders: 1,
          spent: Number(order.total_price || 0),
          lastOrder: order.created_at,
        })
      } else {
        existing.orders += 1
        existing.spent += Number(order.total_price || 0)
        if (new Date(order.created_at) > new Date(existing.lastOrder)) {
          existing.lastOrder = order.created_at
          existing.name = order.customer_name
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime())
  }, [orders])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white lg:text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-slate-400">People who have ordered from your store.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-amber-400" />
            Store Customers ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No store customers yet. Share your store link to get started.</p>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div key={customer.phone} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{customer.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{customer.orders} orders</Badge>
                    <Badge variant="outline">GHc {customer.spent.toFixed(2)}</Badge>
                    <span className="text-xs text-slate-500">Last: {format(new Date(customer.lastOrder), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            Customer Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Customers</p>
            <p className="mt-2 text-2xl font-black text-white">{customers.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Orders</p>
            <p className="mt-2 text-2xl font-black text-white">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Store Revenue</p>
            <p className="mt-2 text-2xl font-black text-white">
              GHc {orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
