'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type ServiceRow = {
  id: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  public_price: number
  price?: number
  is_active: boolean
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export default function PublicOtherServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [selected, setSelected] = useState<ServiceRow | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.client
        .from('online_services')
        .select('id,name,category,description,image_url,public_price,is_active')
        .eq('is_active', true)
        .order('public_price', { ascending: true })

      const rows = (((data as ServiceRow[] | null) || []).map((row) => ({
        ...row,
        public_price: Number(row.public_price || row.price || 0),
      })))

      setServices(rows)
      setLoading(false)
    }

    void load()
  }, [])

  const openCheckout = (service: ServiceRow) => {
    setSelected(service)
    setRecipientPhone('')
    setOpen(true)
  }

  const submit = async () => {
    if (!selected) return
    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient number')
      return
    }

    setSubmitting(true)
    try {
      await startPaystackCheckout({
        flow: 'public_service',
        serviceId: selected.id,
        phone: recipientPhone.trim(),
        customerPhone: recipientPhone.trim(),
        redirectPath: '/other-services',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start checkout')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-zinc-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading services...</div>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <Card className="max-w-md border-zinc-200"><CardContent className="p-6 text-center">No active public services found yet.</CardContent></Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Other Services</p>
          <h1 className="mt-2 text-3xl font-black text-black sm:text-5xl">Simple Service Payments</h1>
          <p className="mt-2 text-zinc-600">Pick a service and checkout fast.</p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="rounded-2xl border border-zinc-200 bg-white">
              <CardContent className="space-y-3 p-5">
                {service.image_url ? (
                  <img src={service.image_url} alt={service.name} className="h-32 w-full rounded-xl object-cover" />
                ) : null}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">{service.category}</p>
                <h2 className="text-lg font-black text-black">{service.name}</h2>
                <p className="text-sm text-zinc-600">{service.description || 'Quick digital service fulfillment.'}</p>
                <p className="text-2xl font-black text-black">{formatGhs(service.public_price)}</p>
                <Button className="w-full rounded-xl bg-black text-white hover:bg-zinc-800" onClick={() => openCheckout(service)}>Pay Now</Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete your service order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recipient Number</Label>
            <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0241234567" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-zinc-800" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Processing...' : 'Proceed to Pay'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
