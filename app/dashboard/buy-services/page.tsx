'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2, Phone, Sparkles } from 'lucide-react'
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
import { DashboardPageShell, DashboardPanel } from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
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
  const [customerName, setCustomerName] = useState('')
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
    setCustomerName('')
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

    if (!customerName.trim()) {
      toast.error('Enter your full name')
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
          customerName: customerName.trim(),
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

  if (loading) return <FlashPageLoader />

  return (
    <DashboardPageShell
      title="Buy Services"
      description="Browse digital services and pay from your wallet at agent rates."
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {services.length === 0 ? (
          <DashboardPanel>
            <p className="text-sm text-gray-500 dark:text-white/50">No active services available yet. Check back soon.</p>
          </DashboardPanel>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]"
              >
                <div className="space-y-3 p-5">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="h-36 w-full rounded-xl border border-gray-200 object-cover dark:border-white/10"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-white/10 dark:bg-white/[0.03]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  )}
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-white/45">
                    {service.category}
                  </p>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{service.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-white/55">
                    {service.description || 'Quick digital service fulfillment.'}
                  </p>
                  <p className="text-3xl font-black text-amber-500">{formatGhs(service.agent_price)}</p>
                  <Button
                    className="w-full rounded-full bg-amber-400 text-black hover:bg-amber-300"
                    onClick={() => openCheckout(service)}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
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
                <Label htmlFor="customer-name">Full Name</Label>
                <Input
                  id="customer-name"
                  placeholder="Your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient-phone">Phone Number</Label>
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
                <span className="text-sm">
                  This order uses your wallet balance. Balance is deducted only when purchase is successful.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={() => void handleWalletCheckout()} disabled={!recipientPhone || !customerName.trim() || !selected || submitting}>
                {submitting ? 'Processing...' : 'Buy with Wallet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardPageShell>
  )
}
