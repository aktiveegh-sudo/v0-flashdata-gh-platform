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
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
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
          .select('id,selling_price,online_services!inner(id,name,category,description)')
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

  const accent = store?.theme_color || '#f97316'

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

    if (checkoutType === 'data' && !recipientPhone.trim()) {
      toast.error('Please enter recipient number')
      return
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Please add your name and phone number')
      return
    }

    if (!customerEmail.trim()) {
      toast.error('Email is required for Paystack payment')
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
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
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
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        redirectPath: `/store/${store.slug}`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not initialize Paystack payment')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed]">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading store...
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed] p-6">
        <Card className="w-full max-w-md border-amber-200 bg-white">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">Store not found</p>
            <p className="mt-2 text-sm text-slate-600">This storefront link is unavailable right now.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fff7ed] text-slate-900">
      <section
        className="relative overflow-hidden"
        style={{
          background: store.cover_url
            ? `linear-gradient(120deg, rgba(15,23,42,.78), rgba(15,23,42,.58)), url(${store.cover_url}) center/cover`
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.22),transparent_42%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 lg:px-6 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl"
          >
            <Badge className="mb-5 border-0 bg-white/20 text-white">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Welcome to {store.brand_name}
            </Badge>
            <h1 className="text-4xl font-black leading-tight text-white lg:text-6xl">
              Your own plug for data and digital essentials.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-100 lg:text-lg">
              {store.tagline || store.description || 'Buy quickly, pay securely, and get served fast from this independent store.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#data-section">
                <Button className="bg-orange-500 text-white hover:bg-orange-600">Buy Data Now</Button>
              </a>
              <a href="#services-banner">
                <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  Explore Services
                </Button>
              </a>
            </div>
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
          className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-100 via-orange-50 to-rose-100 p-6 lg:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">More than data</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">Explore other services in this store</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-700">
                Recharge products, digital tools, and other helpful services curated by this seller.
              </p>
              <a href="#contact-footer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
                Contact store for custom requests <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-md">
              {services.length === 0 ? (
                <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm text-slate-700">No extra services listed yet.</div>
              ) : (
                services.slice(0, 4).map((service) => (
                  <div key={service.id} className="rounded-2xl border border-white/70 bg-white/75 p-3">
                    <p className="text-sm font-semibold text-slate-900">{service.online_services?.name}</p>
                    <p className="mt-1 text-xs text-slate-600">{service.online_services?.category}</p>
                    <p className="mt-2 text-sm font-bold" style={{ color: accent }}>{formatGhs(service.selling_price)}</p>
                    <Button size="sm" className="mt-3 w-full" onClick={() => startServiceCheckout(service)}>
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
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 lg:text-3xl">Buy Data Bundles</h2>
            <p className="mt-2 text-sm text-slate-600">Switch network, tap your package, enter recipient number, and pay.</p>
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
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {network}
                  </button>
                ))}
              </div>

              {filteredPackages.length === 0 ? (
                <p className="text-sm text-slate-600">No data packages available for this network yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPackages.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => startCheckout(item)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{item.data_packages?.network}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.data_packages?.amount}</p>
                      <p className="mt-3 text-lg font-bold" style={{ color: accent }}>{formatGhs(item.selling_price)}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-600">This store has disabled data sales at the moment.</p>
          )}
        </motion.section>
      </main>

      <footer id="contact-footer" className="border-t border-slate-200 bg-slate-900 text-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <h3 className="text-xl font-bold text-white">Contact {store.brand_name}</h3>
          <p className="mt-2 text-sm text-slate-300">Need help with payment or order updates? Reach the store directly.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-orange-300" />
                {store.contact_phone || 'Phone not provided'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-orange-300" />
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
        <DialogContent className="sm:max-w-md">
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
            {checkoutType === 'data' ? (
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

            <div className="space-y-1.5">
              <Label htmlFor="buyer-name">Your Name</Label>
              <Input id="buyer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buyer-phone">Your Phone</Label>
              <Input id="buyer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buyer-email">Your Email</Label>
              <Input id="buyer-email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Secure Paystack checkout will open next.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitStoreOrder()} disabled={submitting} style={{ backgroundColor: accent }}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {formatGhs(checkoutType === 'service' ? selectedService?.selling_price || 0 : selectedPackage?.selling_price || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
