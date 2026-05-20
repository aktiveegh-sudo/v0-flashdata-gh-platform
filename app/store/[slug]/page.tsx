'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, MessageCircle, Phone, Mail, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type StoreProfile = {
  id: string
  brand_name: string
  slug: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  theme_color: string | null
  contact_phone: string | null
  contact_email: string | null
  whatsapp_number: string | null
  allow_data: boolean
  allow_online_services: boolean
}

type StorePackage = {
  id: string
  selling_price: number
  data_packages: {
    id: string
    network: string
    name: string
    amount: string
    validity: string
  } | null
}

type StoreService = {
  id: string
  selling_price: number
  online_services: {
    id: string
    name: string
    category: string
    description: string | null
    image_url: string | null
  } | null
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export default function PublicAgentStorePage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<StoreProfile | null>(null)
  const [packages, setPackages] = useState<StorePackage[]>([])
  const [services, setServices] = useState<StoreService[]>([])

  const [activeNetwork, setActiveNetwork] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<StorePackage | null>(null)
  const [selectedService, setSelectedService] = useState<StoreService | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [afaFullName, setAfaFullName] = useState('')
  const [afaGhanaCardNumber, setAfaGhanaCardNumber] = useState('')
  const [afaLocation, setAfaLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadStore = async () => {
      if (!slug) {
        setLoading(false)
        return
      }

      const { data: storeData, error: storeError } = await supabase.client
        .from('agent_stores')
        .select('id,brand_name,slug,tagline,description,logo_url,cover_url,theme_color,contact_phone,contact_email,whatsapp_number,allow_data,allow_online_services')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (storeError || !storeData) {
        setStore(null)
        setLoading(false)
        return
      }

      setStore(storeData)

      const [{ data: pkgData }, { data: serviceData }] = await Promise.all([
        supabase.client
          .from('agent_store_packages')
          .select('id,selling_price,data_packages!inner(id,network,name,amount,validity)')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .order('selling_price', { ascending: true }),
        supabase.client
          .from('agent_store_service_prices')
          .select('id,selling_price,online_services!inner(id,name,category,description,image_url)')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .order('selling_price', { ascending: true }),
      ])

      const loadedPackages = (pkgData as StorePackage[] | null) ?? []
      const loadedServices = (serviceData as StoreService[] | null) ?? []

      setPackages(loadedPackages)
      setServices(loadedServices)

      const firstNetwork = loadedPackages.find((item) => item.data_packages?.network)?.data_packages?.network || ''
      setActiveNetwork(firstNetwork)
      setLoading(false)
    }

    void loadStore()
  }, [slug])

  const accent = '#facc15'

  const networks = useMemo(() => {
    const set = new Set<string>()
    for (const item of packages) {
      if (item.data_packages?.network) {
        set.add(item.data_packages.network)
      }
    }
    return Array.from(set)
  }, [packages])

  const filteredPackages = useMemo(() => {
    if (!activeNetwork) return packages
    return packages.filter((item) => item.data_packages?.network === activeNetwork)
  }, [activeNetwork, packages])

  const whatsappHref = useMemo(() => {
    const raw = store?.whatsapp_number?.trim()
    if (!raw) return null

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw
    }

    const stripped = raw.replace(/[^\d+]/g, '')
    const digits = stripped.startsWith('+') ? stripped.slice(1) : stripped
    return digits ? `https://wa.me/${digits}` : null
  }, [store?.whatsapp_number])

  const startCheckout = (item: StorePackage) => {
    setSelectedPackage(item)
    setSelectedService(null)
    setRecipientPhone('')
    setAfaFullName('')
    setAfaGhanaCardNumber('')
    setAfaLocation('')
    setCheckoutOpen(true)
  }

  const startServiceCheckout = (item: StoreService) => {
    setSelectedService(item)
    setSelectedPackage(null)
    setRecipientPhone('')
    setAfaFullName('')
    setAfaGhanaCardNumber('')
    setAfaLocation('')
    setCheckoutOpen(true)
  }

  const checkoutType = selectedService ? 'service' : 'data'

  const isAfaRegistration = useMemo(
    () => checkoutType === 'data' && (selectedPackage?.data_packages?.network || '').trim().toUpperCase() === 'AFA',
    [checkoutType, selectedPackage?.data_packages?.network]
  )

  const submitStoreOrder = async () => {
    if (!store) return

    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient number')
      return
    }

    if (isAfaRegistration) {
      if (!afaFullName.trim()) {
        toast.error('Full name is required for AFA registration')
        return
      }

      const ghanaCardPattern = /^GHA-\d{9}-\d$/i
      if (!ghanaCardPattern.test(afaGhanaCardNumber.trim())) {
        toast.error('Enter a valid Ghana Card Number (e.g. GHA-123456789-1)')
        return
      }

      if (!afaLocation.trim()) {
        toast.error('Location is required for AFA registration')
        return
      }
    }

    setSubmitting(true)

    try {
      if (checkoutType === 'service') {
        if (!selectedService?.online_services) {
          throw new Error('No store service selected')
        }

        await startPaystackCheckout({
          flow: 'store_service',
          storeId: store.id,
          serviceId: selectedService.online_services.id,
          phone: recipientPhone.trim(),
          customerPhone: recipientPhone.trim(),
          redirectPath: `/store/${store.slug}`,
        })
        return
      }

      if (!selectedPackage?.data_packages) {
        throw new Error('No store package selected')
      }

      await startPaystackCheckout({
        flow: isAfaRegistration ? 'store_afa' : 'store_data',
        storeId: store.id,
        packageId: selectedPackage.data_packages.id,
        phone: recipientPhone.trim(),
        fullName: isAfaRegistration ? afaFullName.trim() : undefined,
        ghanaCardNumber: isAfaRegistration ? afaGhanaCardNumber.trim().toUpperCase() : undefined,
        location: isAfaRegistration ? afaLocation.trim() : undefined,
        redirectPath: `/store/${store.slug}`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not initialize Paystack payment')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex items-center gap-2 text-zinc-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading store...
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
        <Card className="w-full max-w-md border-yellow-400/30 bg-white/5 text-white backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-white">Store not found</p>
            <p className="mt-2 text-sm text-zinc-300">This storefront link is unavailable right now.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1a1a1a_0%,#090909_45%,#000000_100%)] text-white">
      <section
        className="relative overflow-hidden"
        style={{
          background: store.cover_url
            ? `linear-gradient(120deg, rgba(0,0,0,.84), rgba(0,0,0,.66)), url(${store.cover_url}) center/cover`
            : 'linear-gradient(135deg, #050505 0%, #0b0b0b 50%, #171717 100%)',
        }}
      >
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute -right-12 top-24 h-72 w-72 rounded-full bg-yellow-200/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,.18),transparent_46%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 lg:px-6 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-5xl text-center"
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-zinc-200 backdrop-blur-xl">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live
              </span>
              <span className="text-zinc-500">|</span>
              <span>Fast Checkout</span>
              <span className="text-zinc-500">|</span>
              <span className="inline-flex items-center gap-1 text-yellow-200">
                <Sparkles className="h-3.5 w-3.5" /> Instant Delivery
              </span>
            </div>

            <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-7xl">
              Best Deals on
              <span className="block bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                Data and Services
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base text-zinc-300 lg:text-2xl">
              {store.tagline || store.description || 'Buy quickly, pay securely, and get served fast from this independent store.'}
            </p>

            <div className="mx-auto mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="#data-section">
                <Button className="h-14 w-full border border-yellow-300 bg-yellow-300 px-8 text-lg font-bold text-black shadow-[0_0_25px_rgba(250,204,21,0.45)] hover:bg-yellow-200">
                  Buy Data
                </Button>
              </a>
              <a href="#services-banner">
                <Button variant="outline" className="h-14 w-full border-white/20 bg-white/5 px-8 text-lg font-semibold text-zinc-200 backdrop-blur-md hover:border-yellow-300/40 hover:bg-white/10">
                  Explore Services
                </Button>
              </a>
            </div>

            <p className="mt-5 text-sm text-zinc-400">Welcome to {store.brand_name}</p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 lg:px-6 lg:py-14">
        <motion.section
          id="services-banner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-yellow-300/20 bg-white/5 p-6 shadow-[0_10px_60px_rgba(250,204,21,0.14)] backdrop-blur-xl lg:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">More than data</p>
              <h2 className="mt-2 text-2xl font-bold text-white lg:text-3xl">Explore other services in this store</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                Recharge products, digital tools, and other helpful services curated by this seller.
              </p>
              <a href="#contact-footer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-yellow-200 underline-offset-4 hover:underline">
                Contact store for custom requests <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-md">
              {services.length === 0 ? (
                <div className="rounded-2xl border border-white/20 bg-black/45 p-3 text-sm text-zinc-300 backdrop-blur-md">No extra services listed yet.</div>
              ) : (
                services.slice(0, 4).map((service) => (
                  <div key={service.id} className="rounded-2xl border border-yellow-300/20 bg-white/10 p-3 shadow-[0_0_30px_rgba(250,204,21,0.08)] backdrop-blur-md transition hover:border-yellow-300/50 hover:shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                    {service.online_services?.image_url ? (
                      <img
                        src={service.online_services.image_url}
                        alt={service.online_services?.name || 'Service image'}
                        className="mb-2 h-24 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <p className="text-sm font-semibold text-white">{service.online_services?.name}</p>
                    <p className="mt-1 text-xs text-zinc-300">{service.online_services?.category}</p>
                    <p className="mt-2 text-sm font-bold" style={{ color: accent }}>{formatGhs(service.selling_price)}</p>
                    <Button size="sm" className="mt-3 w-full border border-yellow-300 bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => startServiceCheckout(service)}>
                      Pay Now
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="data-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-yellow-300/20 bg-white/5 p-6 shadow-[0_10px_60px_rgba(250,204,21,0.08)] backdrop-blur-xl lg:p-8"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white lg:text-3xl">Buy Data Bundles</h2>
            <p className="mt-2 text-sm text-zinc-300">Switch network, tap your package, enter recipient number, and pay.</p>
          </div>

          {store.allow_data ? (
            <>
              <div className="mb-5 flex flex-wrap gap-2">
                {networks.map((network) => (
                  <button
                    key={network}
                    onClick={() => setActiveNetwork(network)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeNetwork === network
                        ? 'border border-yellow-300 bg-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                        : 'border border-white/15 bg-white/10 text-zinc-100 hover:border-yellow-300/50 hover:bg-white/15'
                    }`}
                  >
                    {network}
                  </button>
                ))}
              </div>

              {filteredPackages.length === 0 ? (
                <p className="text-sm text-zinc-300">No data packages available for this network yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPackages.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => startCheckout(item)}
                      className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-4 text-left shadow-sm backdrop-blur-md transition hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_0_24px_rgba(250,204,21,0.2)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">{item.data_packages?.network}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.data_packages?.amount}</p>
                      <p className="mt-3 text-lg font-bold" style={{ color: accent }}>{formatGhs(item.selling_price)}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-300">This store has disabled data sales at the moment.</p>
          )}
        </motion.section>
      </main>

      <footer id="contact-footer" className="border-t border-yellow-300/20 bg-black text-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <h3 className="text-xl font-bold text-white">Contact {store.brand_name}</h3>
          <p className="mt-2 text-sm text-slate-300">Need help with payment or order updates? Reach the store directly.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-yellow-300/20 bg-white/5 p-4 backdrop-blur-md">
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-yellow-300" />
                {store.contact_phone || 'Phone not provided'}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-300/20 bg-white/5 p-4 backdrop-blur-md">
              <p className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-yellow-300" />
                {store.contact_email || 'Email not provided'}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600"
        >
          <MessageCircle className="h-4 w-4" />
          Join WhatsApp Group
        </a>
      ) : null}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="border-yellow-300/20 bg-zinc-950/95 text-white backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checkoutType === 'service'
                ? 'Complete your service purchase'
                : isAfaRegistration
                  ? 'Complete your AFA registration'
                  : 'Complete your data purchase'}
            </DialogTitle>
            <DialogDescription>
              {checkoutType === 'service'
                ? `${selectedService?.online_services?.name || 'Service'} - ${formatGhs(selectedService?.selling_price || 0)}`
                : `${selectedPackage?.data_packages?.network} ${selectedPackage?.data_packages?.amount} - ${formatGhs(selectedPackage?.selling_price || 0)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {checkoutType === 'data' || checkoutType === 'service' ? (
              <div className="space-y-1.5">
                <Label htmlFor="recipient">{isAfaRegistration ? 'Phone Number' : 'Recipient Number'}</Label>
                <Input
                  id="recipient"
                  placeholder="e.g. 024XXXXXXX"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            ) : null}

            {isAfaRegistration ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="afa-full-name">Full Name</Label>
                  <Input
                    id="afa-full-name"
                    value={afaFullName}
                    onChange={(e) => setAfaFullName(e.target.value)}
                    placeholder="As it appears on Ghana Card"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="afa-ghana-card">Ghana Card Number</Label>
                  <Input
                    id="afa-ghana-card"
                    value={afaGhanaCardNumber}
                    onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())}
                    placeholder="GHA-123456789-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="afa-location">Location</Label>
                  <Input
                    id="afa-location"
                    value={afaLocation}
                    onChange={(e) => setAfaLocation(e.target.value)}
                    placeholder="Town / Area"
                  />
                </div>
              </>
            ) : null}

            <div className="rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-sm text-yellow-100">
              <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Secure Paystack checkout will open next.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button className="border border-yellow-300 bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => void submitStoreOrder()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {formatGhs(checkoutType === 'service' ? selectedService?.selling_price || 0 : selectedPackage?.selling_price || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
