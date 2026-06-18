'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Package, Search } from 'lucide-react'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TrackedOrder = {
  id: string
  source: 'dashboard' | 'store' | 'public'
  reference: string | null
  phone: string
  status: string
  amount: number
  itemLabel: string
  network: string | null
  createdAt: string
  statusMessage: string
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    case 'processing':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    case 'pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-red-500/15 text-red-700 dark:text-red-300'
  }
}

const sourceLabel = (source: TrackedOrder['source']) => {
  switch (source) {
    case 'public':
      return 'Public checkout'
    case 'store':
      return 'Store order'
    default:
      return 'Agent order'
  }
}

export default function TrackOrderPage() {
  const [phone, setPhone] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [orders, setOrders] = useState<TrackedOrder[]>([])

  const handleTrack = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!phone.trim() && !reference.trim()) {
      setMessage('Enter a phone number or payment reference to track your order.')
      setOrders([])
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          reference: reference.trim() || undefined,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { orders?: TrackedOrder[]; message?: string } }
        | null

      if (!response.ok || !result?.success) {
        setOrders([])
        setMessage(result?.error || 'Unable to track order right now.')
        return
      }

      setOrders(result.data?.orders || [])
      setMessage(result.data?.message || null)
    } catch {
      setOrders([])
      setMessage('Unable to track order right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainSiteShell activeTab="track-order">
      <section className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Track Your Data Delivery</p>
            <h1 className="mt-2 text-3xl font-black">Track Order</h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-white/50">
              Enter the recipient phone number or Paystack reference to check payment and delivery status instantly.
            </p>
          </div>

          <Card className="mt-8 border-gray-200 shadow-sm dark:border-white/8">
            <CardHeader>
              <CardTitle className="text-base">Order Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void handleTrack(event)} className="space-y-4">
                <Input
                  placeholder="Recipient phone number (e.g. 0241234567)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  placeholder="Payment reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-amber-400 text-black hover:bg-amber-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tracking...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Track Order
                    </>
                  )}
                </Button>
              </form>

              {message ? (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    orders.length > 0
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {orders.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {orders.map((order) => (
                    <div
                      key={`${order.source}-${order.id}`}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold">{order.itemLabel}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                              {sourceLabel(order.source)} · {order.phone}
                            </p>
                            {order.reference ? (
                              <p className="mt-1 font-mono text-xs text-gray-500 dark:text-white/45">
                                Ref: {order.reference}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <Badge className={`capitalize ${statusBadgeClass(order.status)}`}>{order.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <p className="text-gray-600 dark:text-white/65">{order.statusMessage}</p>
                        <div className="text-right text-xs text-gray-500 dark:text-white/45">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            GHc {order.amount.toFixed(2)}
                          </p>
                          <p>{format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </MainSiteShell>
  )
}
