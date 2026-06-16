'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2, Phone, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

type ServiceRow = {
  id: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  agent_price: number
  public_price?: number
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
}

const normalizeToGhanaPhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+233${digits.slice(1)}`
  }

  if (digits.length === 12 && digits.startsWith('233')) {
    return `+${digits}`
  }

  if (value.trim().startsWith('+233') && digits.length === 12) {
    return `+${digits}`
  }

  return null
}

export default function BuyServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ServiceRow | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { setLoading: setGlobalLoading } = useLoadingStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const response = await fetch('/api/services/active', { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: ServiceRow[]; error?: string }
        | null

      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || 'Unable to load services')
        setServices([])
        setLoading(false)
        return
      }

      setServices(
        (payload.data || []).map((row) => ({
          ...row,
          agent_price: Number(row.agent_price || row.public_price || 0),
        }))
      )
      setLoading(false)
    }

    void load()
  }, [])

  const openCheckout = (service: ServiceRow) => {
    setSelected(service)
    setRecipientPhone('')
  }

  const getAuthHeaders = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''

    if (!accessToken) {
      throw new Error('Please login again')
    }

    return { Authorization: `Bearer ${accessToken}` }
  }

  const handleWalletCheckout = async () => {
    if (!selected) return

    const normalizedPhone = normalizeToGhanaPhone(recipientPhone)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    setSubmitting(true)
    setGlobalLoading(true)

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch('/api/dashboard/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          flow: 'service',
          serviceId: selected.id,
          phone: normalizedPhone,
        }),
      })

      const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Unable to process wallet payment')
      }

      toast.success('Service order submitted and wallet deducted successfully')
      setSelected(null)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to process wallet payment')
      setSubmitting(false)
      setGlobalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading services...
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">Buy Services</h1>
        <p className="text-slate-400">Browse digital services and pay from your wallet at agent rates</p>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No active services available yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden border-white/10 bg-[#070d16]">
              <CardContent className="space-y-3 p-5">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="h-36 w-full rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">{service.category}</p>
                <h2 className="text-xl font-black text-white">{service.name}</h2>
                <p className="text-sm text-zinc-400">{service.description || 'Quick digital service fulfillment.'}</p>
                <p className="text-3xl font-black text-[#f4c532]">{formatGhs(service.agent_price)}</p>
                <Button className="w-full rounded-full bg-[#f4c532] text-black hover:bg-[#e7b71d]" onClick={() => openCheckout(service)}>
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Service Purchase</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.name} - ${formatGhs(selected.agent_price)}` : 'Select a service to continue'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-phone">Recipient Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recipient-phone"
                  type="tel"
                  placeholder="024 123 4567"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(formatPhoneNumber(e.target.value))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selected?.name || 'Not selected'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">{formatGhs(selected?.agent_price || 0)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">This order uses your wallet balance. Balance is deducted only when purchase is successful.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleWalletCheckout()} disabled={!recipientPhone || !selected || submitting}>
              {submitting ? 'Processing...' : 'Buy with Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
