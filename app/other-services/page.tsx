'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MainSiteShell } from '@/components/public/main-site-shell'
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
      <MainSiteShell activeTab="services">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading services...</div>
        </div>
      </MainSiteShell>
    )
  }

  if (services.length === 0) {
    return (
      <MainSiteShell activeTab="services">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="max-w-md border-yellow-300/20 bg-zinc-950/80 text-zinc-100"><CardContent className="p-6 text-center">No active public services found yet.</CardContent></Card>
        </div>
      </MainSiteShell>
    )
  }

  return (
    <MainSiteShell activeTab="services">
      <section className="rounded-3xl border border-yellow-300/20 bg-[#0a1223] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Digital Services</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Pay for Services in Seconds</h1>
        <p className="mt-3 text-zinc-300">Simple flow, instant payment verification, and fast fulfillment.</p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="rounded-2xl border border-yellow-300/20 bg-[#0a111d] text-zinc-100">
            <CardContent className="space-y-3 p-5">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="h-36 w-full rounded-xl border border-yellow-300/20 object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl border border-yellow-300/20 bg-black/40 text-zinc-500">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">{service.category}</p>
              <h2 className="text-xl font-black text-white">{service.name}</h2>
              <p className="text-sm text-zinc-400">{service.description || 'Quick digital service fulfillment.'}</p>
              <p className="text-3xl font-black text-yellow-300">{formatGhs(service.public_price)}</p>
              <Button className="w-full rounded-full bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => openCheckout(service)}>Pay Now</Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-yellow-300/25 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Complete your service order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recipient Number</Label>
            <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0241234567" className="border-yellow-300/25 bg-zinc-900" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-yellow-300/35 bg-transparent text-zinc-100 hover:bg-yellow-300/10" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Processing...' : 'Proceed to Pay'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainSiteShell>
  )
}
