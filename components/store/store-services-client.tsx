'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startPaystackCheckout } from '@/lib/paystack/client'
import type { StoreRecord } from '@/lib/store-tenant'
import toast from 'react-hot-toast'

type StoreServicesClientProps = {
  store: StoreRecord
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export function StoreServicesClient({ store }: StoreServicesClientProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedService = useMemo(
    () => store.services.find((item) => item.id === selectedServiceId) || null,
    [selectedServiceId, store.services]
  )

  const openCheckout = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    setRecipientPhone('')
  }

  const submitCheckout = async () => {
    if (!selectedService) return
    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient number')
      return
    }

    setSubmitting(true)
    try {
      await startPaystackCheckout({
        flow: 'store_service',
        storeId: store.storeId,
        serviceId: selectedService.id,
        phone: recipientPhone.trim(),
        customerPhone: recipientPhone.trim(),
        redirectPath: `/store/${store.slug}/payment-complete`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to initialize payment')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-yellow-300/20 bg-[#0a1223] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Store Services</p>
        <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Choose a service and pay instantly</h2>
        <p className="mt-2 text-sm text-zinc-300">All active services are available for direct checkout on this page.</p>
      </section>

      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Fast processing</p>
        <p className="mt-1 text-xs text-emerald-100/90">Service orders are verified and processed immediately after payment.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {store.services.map((item) => (
          <Card key={item.id} className="rounded-2xl border border-yellow-300/20 bg-[#0b111f] text-white">
            <CardContent className="p-5">
              <p className="rounded-full bg-yellow-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-yellow-200 w-fit">{item.category}</p>
              <h3 className="mt-3 text-xl font-black">{item.name}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              <p className="mt-4 text-3xl font-black text-yellow-300">{formatGhs(item.price)}</p>
              <Button className="mt-4 w-full rounded-full bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => openCheckout(item.id)}>
                Buy Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={Boolean(selectedService)} onOpenChange={(open) => !open && setSelectedServiceId(null)}>
        <DialogContent className="border-yellow-300/25 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Complete service order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recipient Number</Label>
            <Input
              value={recipientPhone}
              onChange={(event) => setRecipientPhone(event.target.value)}
              placeholder="0241234567"
              className="border-yellow-300/25 bg-zinc-900"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-yellow-300/35 bg-transparent text-zinc-100 hover:bg-yellow-300/10" onClick={() => setSelectedServiceId(null)}>
              Cancel
            </Button>
            <Button className="bg-yellow-300 text-black hover:bg-yellow-200" disabled={submitting} onClick={() => void submitCheckout()}>
              {submitting ? 'Processing...' : 'Proceed to Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
