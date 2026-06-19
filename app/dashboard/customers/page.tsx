'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, Phone, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
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

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0)

  return (
    <DashboardPageShell
      title="Customers"
      description="People who have ordered from your store."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Total Customers" value={String(customers.length)} icon={Users} />
          <DashboardStatCard label="Total Orders" value={String(orders.length)} icon={ShoppingBag} />
          <DashboardStatCard label="Store Revenue" value={`GHc ${totalRevenue.toFixed(2)}`} icon={ShoppingBag} />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Store Customers" description={`${customers.length} unique customer${customers.length === 1 ? '' : 's'}`}>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">Loading customers...</p>
        ) : customers.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">
            No store customers yet. Share your store link to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <div
                key={customer.phone}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/8 dark:bg-white/[0.02]"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-white/55">
                    <Phone className="h-3.5 w-3.5 text-amber-500" />
                    {customer.phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{customer.orders} orders</Badge>
                  <Badge variant="outline">GHc {customer.spent.toFixed(2)}</Badge>
                  <span className="text-xs text-gray-400 dark:text-white/40">
                    Last: {format(new Date(customer.lastOrder), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
