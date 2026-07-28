'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Phone, Radio, ShoppingBag, Smartphone } from 'lucide-react'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { orderCategoryMeta, type AdminOrderCategory } from '@/lib/admin/orders-feed'
import { supabase } from '@/lib/supabase/client'

type Counts = Record<Exclude<AdminOrderCategory, 'all'>, number>

const cards: Array<{
  key: Exclude<AdminOrderCategory, 'all'>
  icon: typeof ClipboardList
}> = [
  { key: 'data', icon: Smartphone },
  { key: 'afa', icon: Radio },
  { key: 'airtime', icon: Phone },
  { key: 'services', icon: ShoppingBag },
]

export default function AdminOrdersHubPage() {
  const [counts, setCounts] = useState<Counts>({ data: 0, afa: 0, airtime: 0, services: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ordersRes, afaRes, storeRes, airtimeRes] = await Promise.all([
        supabase.client.from('orders').select('id', { count: 'exact', head: true }),
        supabase.client.from('afa_registrations').select('id', { count: 'exact', head: true }),
        supabase.client.from('agent_store_orders').select('id,item_type,data_packages(network),online_services(category,name)'),
        supabase.client.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'airtime'),
      ])

      const storeRows = (storeRes.data || []) as Array<{
        item_type: 'data' | 'service'
        data_packages?: { network?: string } | null
        online_services?: { category?: string; name?: string } | null
      }>

      let storeData = 0
      let storeAfa = 0
      let storeAirtime = 0
      let storeServices = 0

      for (const row of storeRows) {
        if (row.item_type === 'service') {
          const label = `${row.online_services?.category || ''} ${row.online_services?.name || ''}`.toLowerCase()
          if (label.includes('airtime')) storeAirtime += 1
          else storeServices += 1
        } else if (String(row.data_packages?.network || '').toUpperCase() === 'AFA') {
          storeAfa += 1
        } else {
          storeData += 1
        }
      }

      setCounts({
        data: Number(ordersRes.count || 0) + storeData,
        afa: Number(afaRes.count || 0) + storeAfa,
        airtime: Number(airtimeRes.count || 0) + storeAirtime,
        services: storeServices,
      })
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <AdminPageShell
      title="Orders"
      description="Choose an order category to manage data, AFA, airtime, and service orders separately."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const meta = orderCategoryMeta[card.key]
          const Icon = card.icon
          return (
            <AdminPanel key={card.key} className="h-full">
              <div className="flex h-full flex-col gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">{meta.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/55">{meta.description}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
                  {loading ? 'Counting...' : `${counts[card.key]} orders`}
                </p>
                <Button asChild className="mt-auto w-fit rounded-full bg-amber-400 text-black hover:bg-amber-300">
                  <Link href={meta.href}>Open {meta.title}</Link>
                </Button>
              </div>
            </AdminPanel>
          )
        })}
      </div>
    </AdminPageShell>
  )
}
