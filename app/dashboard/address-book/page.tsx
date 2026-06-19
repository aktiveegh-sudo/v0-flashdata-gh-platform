'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Users, Phone, ShoppingBag, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAddressBook, type AddressBookEntry } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

export default function AddressBookPage() {
  const [entries, setEntries] = useState<AddressBookEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setError('Please login again')
        setLoading(false)
        return
      }

      try {
        const rows = await fetchAddressBook(userId)
        setEntries(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load address book')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.phone.toLowerCase().includes(q)
    )
  }, [entries, search])

  const totalOrders = entries.reduce((sum, entry) => sum + entry.orders, 0)

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Address Book" description="Saved customer numbers from your store orders.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Address Book"
      description="Frequent customers from your store — search by name or phone for faster checkout."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Customers" value={String(entries.length)} icon={Users} />
          <DashboardStatCard label="Total Orders" value={String(totalOrders)} icon={ShoppingBag} />
          <DashboardStatCard
            label="Top Buyer"
            value={entries[0]?.name || '—'}
            hint={entries[0] ? `${entries[0].orders} orders` : 'No data yet'}
            icon={Calendar}
          />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Customer Directory" description="Aggregated from your store order history.">
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-white/50">
            {entries.length === 0
              ? 'No customers yet. Share your store link to start building your address book.'
              : 'No customers match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/45">
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 pr-4 font-semibold">Phone</th>
                  <th className="pb-3 pr-4 font-semibold">Orders</th>
                  <th className="pb-3 font-semibold">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.phone}
                    className="border-b border-gray-50 last:border-0 dark:border-white/[0.03]"
                  >
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{entry.name}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-white/65">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-amber-500" />
                        {entry.phone}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{entry.orders}</Badge>
                    </td>
                    <td className="py-3 text-gray-500 dark:text-white/50">
                      {format(new Date(entry.lastOrderAt), 'MMM d, yyyy · h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
