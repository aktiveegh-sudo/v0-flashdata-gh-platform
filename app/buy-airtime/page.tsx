'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Phone, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'] as const

type AirtimeService = {
  id: string
  name: string
  public_price: number
  price: number
}

export default function BuyAirtimePublicPage() {
  const [services, setServices] = useState<AirtimeService[]>([])
  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>('MTN')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.client
        .from('online_services')
        .select('id,name,public_price,price,category')
        .eq('is_active', true)
        .or('category.ilike.%airtime%,name.ilike.%airtime%')
        .order('public_price', { ascending: true })

      const list = ((data as AirtimeService[] | null) || []).map((item) => ({
        ...item,
        public_price: Number(item.public_price || item.price || 0),
      }))

      setServices(list)
      setSelectedServiceId(list[0]?.id || '')
      setLoading(false)
    }

    void load()
  }, [])

  const quickAmounts = useMemo(() => services.slice(0, 6), [services])

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]

  const handlePurchase = async () => {
    const normalizedPhone = phone.replace(/\D/g, '')

    if (!normalizedPhone || normalizedPhone.length < 9) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    if (!selectedService) {
      toast.error('No airtime packages available yet')
      return
    }

    setSubmitting(true)
    try {
      await startPaystackCheckout({
        flow: 'public_service',
        serviceId: selectedService.id,
        phone: normalizedPhone,
        redirectPath: '/buy-airtime',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment could not start')
      setSubmitting(false)
    }
  }

  return (
    <MainSiteShell activeTab="buy-airtime">
      <section className="px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Buy Airtime</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Instant Airtime Top-Up</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-white/55">
              Top up MTN, Telecel, or AirtelTigo lines in seconds. Secured by Paystack — no account needed.
            </p>
          </div>

          {loading ? (
            <div className="mt-10 flex justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : services.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#0a0a0f]">
              <p className="text-sm text-gray-500 dark:text-white/55">
                Public airtime packages are being configured. Agents can buy airtime from the dashboard wallet now.
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f] md:p-8">
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-black">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Mobile Money Checkout</p>
                  <p className="text-xs text-gray-500 dark:text-white/50">Pay with MoMo or card via Paystack</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">Network</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {NETWORKS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setNetwork(item)}
                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                          network === item
                            ? 'border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white/80'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">Airtime Package</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {quickAmounts.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          selectedServiceId === service.id
                            ? 'border-amber-400 bg-amber-400/15'
                            : 'border-gray-200 bg-gray-50 hover:border-amber-400/40 dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{service.name}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-300">
                          GHc {service.public_price.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Recipient Phone ({network})
                  </Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="024 123 4567"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={submitting || !selectedService}
                  onClick={() => void handlePurchase()}
                  className="h-12 w-full rounded-full bg-amber-400 text-base font-black text-black hover:bg-amber-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay GHc ${(selectedService?.public_price || 0).toFixed(2)} with Paystack`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </MainSiteShell>
  )
}
