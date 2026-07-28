'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock3, Menu, Moon, PackageSearch, RefreshCw, Search, Sun, Users, X } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { startPaystackCheckout } from '@/lib/paystack/client'
import { getStorePaymentCompletePath } from '@/lib/store-paths'
import {
  buildWhatsAppUrl,
  bytebossNetworkBadgeClass,
  bytebossNetworkCardClass,
  formatNetworkLabel,
  groupStorePackagesByNetwork,
  parsePackageGb,
} from '@/lib/store-byteboss'
import type { StoreDataPackage, StoreRecord, StoreService } from '@/lib/store-tenant'
import { useStoreTheme } from '@/components/store/store-theme-provider'
import toast from 'react-hot-toast'

type StoreFrontProps = {
  store: StoreRecord
}

type TrackedOrder = {
  id: string
  source: string
  reference: string | null
  phone: string
  status: string
  amount: number
  itemLabel: string
  network: string | null
  createdAt: string
  statusMessage: string
}

const statusClass = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
    case 'processing':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300'
    case 'pending':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    default:
      return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
  }
}

function NetworkBadge({ network, className = '' }: { network: string; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${bytebossNetworkBadgeClass(network)} ${className}`}
    >
      {formatNetworkLabel(network)}
    </span>
  )
}

function PackageCard({ pkg, onSelect }: { pkg: StoreDataPackage; onSelect: () => void }) {
  const gb = parsePackageGb(pkg.amount)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:p-5 ${bytebossNetworkCardClass(pkg.network)}`}
    >
      <NetworkBadge network={pkg.network} />
      <div className="mt-3 text-2xl font-black sm:text-3xl">
        {gb}
        <span className="text-lg font-bold sm:text-xl">GB</span>
      </div>
      <p className="mt-1 text-sm opacity-80">{formatNetworkLabel(pkg.network)} Bundle</p>
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="text-xl font-bold sm:text-2xl">GHc {Number(pkg.price || 0).toFixed(2)}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium opacity-70">
          <Clock3 className="h-3.5 w-3.5" />
          1-5 min
        </span>
      </div>
    </button>
  )
}

function ServiceCard({ service, onSelect }: { service: StoreService; onSelect: () => void }) {
  const { isDark } = useStoreTheme()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 ${
        isDark ? 'border-white/10 bg-zinc-900 text-white hover:border-amber-400/40' : 'border-zinc-200 bg-white text-zinc-900 hover:border-amber-400/60'
      }`}
    >
      {service.imageUrl ? (
        <img src={service.imageUrl} alt={service.name} className="aspect-[16/10] w-full object-cover" />
      ) : null}
      <div className="p-4 sm:p-5">
        <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
          {service.category}
        </span>
        <h3 className="mt-3 text-lg font-black">{service.name}</h3>
        <p className="mt-2 text-sm opacity-70">{service.description}</p>
        <p className="mt-4 text-xl font-bold text-amber-600 dark:text-amber-300">GHc {Number(service.price || 0).toFixed(2)}</p>
      </div>
    </button>
  )
}

export function StoreFront({ store }: StoreFrontProps) {
  const { isDark, toggleTheme } = useStoreTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackPhone, setTrackPhone] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackOrders, setTrackOrders] = useState<TrackedOrder[]>([])

  const [selectedPackage, setSelectedPackage] = useState<StoreDataPackage | null>(null)
  const [selectedService, setSelectedService] = useState<StoreService | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [afaFullName, setAfaFullName] = useState('')
  const [afaGhanaCard, setAfaGhanaCard] = useState('')
  const [afaLocation, setAfaLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const groupedPackages = useMemo(() => groupStorePackagesByNetwork(store.dataPackages), [store.dataPackages])
  const isAfa = (selectedPackage?.network || '').trim().toUpperCase() === 'AFA'
  const whatsappNumber = store.whatsappNumber || store.contactPhone

  const pageBg = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
  const mutedText = isDark ? 'text-zinc-400' : 'text-zinc-500'

  const openWhatsApp = () => {
    if (!whatsappNumber) {
      toast.error('WhatsApp contact is not configured for this store yet.')
      return
    }
    const message = `Hi ${store.name}, I have a question about your data bundles.`
    window.open(buildWhatsAppUrl(whatsappNumber, message), '_blank')
  }

  const trackOrdersByPhone = async () => {
    const phone = trackPhone.trim()
    if (!phone) {
      toast.error('Enter the phone number used when ordering.')
      return
    }

    setTrackLoading(true)
    try {
      const response = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const result = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: { orders?: TrackedOrder[]; message?: string }
        error?: string
      } | null

      if (!response.ok || !result?.success) {
        toast.error(result?.error || 'Could not track orders')
        setTrackOrders([])
        return
      }

      setTrackOrders(result.data?.orders || [])
    } finally {
      setTrackLoading(false)
    }
  }

  const submitCheckout = async () => {
    if (selectedPackage) {
      if (!recipientPhone.trim()) {
        toast.error('Enter recipient phone number')
        return
      }
      if (isAfa) {
        const cardPattern = /^GHA-\d{9}-\d$/i
        if (!afaFullName.trim() || !afaLocation.trim() || !cardPattern.test(afaGhanaCard.trim())) {
          toast.error('Complete valid AFA details')
          return
        }
      }

      setSubmitting(true)
      try {
        await startPaystackCheckout({
          flow: isAfa ? 'store_afa' : 'store_data',
          storeId: store.storeId,
          packageId: selectedPackage.id,
          phone: recipientPhone.trim(),
          fullName: isAfa ? afaFullName.trim() : undefined,
          ghanaCardNumber: isAfa ? afaGhanaCard.trim().toUpperCase() : undefined,
          location: isAfa ? afaLocation.trim() : undefined,
          customerPhone: recipientPhone.trim(),
          redirectPath: getStorePaymentCompletePath(store.slug, window.location.host),
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Payment could not start')
        setSubmitting(false)
      }
      return
    }

    if (selectedService) {
      if (!customerName.trim()) {
        toast.error('Enter your full name')
        return
      }
      if (!recipientPhone.trim()) {
        toast.error('Enter your phone number')
        return
      }

      setSubmitting(true)
      try {
        await startPaystackCheckout({
          flow: 'store_service',
          storeId: store.storeId,
          serviceId: selectedService.id,
          phone: recipientPhone.trim(),
          customerName: customerName.trim(),
          customerPhone: recipientPhone.trim(),
          redirectPath: getStorePaymentCompletePath(store.slug, window.location.host),
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Payment could not start')
        setSubmitting(false)
      }
    }
  }

  useEffect(() => {
    if (!trackOpen) return
    const hash = window.location.hash
    if (hash === '#track') setTrackOpen(true)
  }, [trackOpen])

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isDark ? 'border-white/10 bg-zinc-950/90' : 'border-zinc-200/80 bg-white/90'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            ) : (
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-black ${
                  isDark ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-[#FFCC00]'
                }`}
              >
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className={`truncate font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{store.name}</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" className={mutedText} onClick={() => setTrackOpen(true)}>
              Track order
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div
            className={`absolute right-0 top-0 h-full w-72 border-l p-4 shadow-xl ${
              isDark ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-black">{store.name}</p>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setTrackOpen(true)
                  setMobileOpen(false)
                }}
              >
                Track order
              </Button>
              {whatsappNumber ? (
                <Button className="w-full justify-start bg-[#25D366] text-white hover:bg-[#1ebe5d]" onClick={openWhatsApp}>
                  WhatsApp us
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="px-4 py-10 text-center md:py-14">
        <div
          className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Open now
        </div>
        <h1 className={`text-3xl font-black tracking-tight sm:text-4xl md:text-5xl ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {store.name}
        </h1>
        <p className={`mx-auto mt-4 max-w-lg text-base leading-relaxed sm:text-lg ${mutedText}`}>
          Pick a bundle below. Pay by Mobile Money. Delivered in 1-5 min.
        </p>
        {whatsappNumber ? (
          <Button
            size="lg"
            className="mt-7 h-12 rounded-full bg-[#25D366] px-8 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-[#1ebe5d]"
            onClick={openWhatsApp}
          >
            WhatsApp us
          </Button>
        ) : null}
      </section>

      <main id="bundles" className="mx-auto max-w-5xl space-y-10 px-4 pb-8">
        {groupedPackages.length === 0 ? (
          <div
            className={`rounded-2xl border p-12 text-center ${
              isDark ? 'border-white/10 bg-zinc-900/50 text-zinc-400' : 'border-zinc-200 bg-white text-zinc-500'
            }`}
          >
            No packages listed yet. Check back soon!
          </div>
        ) : (
          groupedPackages.map((group) => (
            <section key={group.network} className="space-y-4">
              <div className="flex items-center gap-3">
                <NetworkBadge network={group.network} className="text-xs px-2.5 py-1" />
                <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatNetworkLabel(group.network)} · {group.items.length} bundle{group.items.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onSelect={() => {
                      setSelectedService(null)
                      setSelectedPackage(pkg)
                      setRecipientPhone('')
                    }}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {store.services.length > 0 ? (
          <section id="services" className="space-y-4 pt-4">
            <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>Digital Services</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {store.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={() => {
                    setSelectedPackage(null)
                    setSelectedService(service)
                    setRecipientPhone('')
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className={`mt-16 border-t ${isDark ? 'border-white/10 bg-zinc-900/50' : 'border-zinc-200 bg-white'}`}>
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-2">
          <div>
            <h3 className={`mb-2 text-lg font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{store.name}</h3>
            <p className={`max-w-sm text-sm leading-relaxed ${mutedText}`}>
              Buy MTN, Telecel and AirtelTigo bundles in seconds. Pay by Mobile Money and get delivery in 1-5 minutes.
            </p>
            <p className={`mt-4 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Built in Ghana · Powered by FlashData GH</p>
          </div>
          <div>
            <h3 className={`mb-3 text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick links</h3>
            <ul className={`space-y-2 text-sm ${mutedText}`}>
              <li>
                <button type="button" className="hover:text-amber-500" onClick={() => setTrackOpen(true)}>
                  Track order
                </button>
              </li>
              <li>
                <a href="#bundles" className="hover:text-amber-500">
                  View bundles
                </a>
              </li>
              {whatsappNumber ? (
                <li>
                  <button type="button" className="hover:text-amber-500" onClick={openWhatsApp}>
                    Chat on WhatsApp
                  </button>
                </li>
              ) : null}
              <li>
                <Link href={`/store/${store.slug}/join`} className="inline-flex items-center gap-1.5 hover:text-amber-500">
                  <Users className="h-3.5 w-3.5" />
                  Become a Sub-Agent
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <Button
        onClick={() => setTrackOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 rounded-full px-5 font-semibold shadow-lg ${
          isDark ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/25' : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/20'
        }`}
        size="lg"
      >
        <PackageSearch className="mr-2 h-5 w-5" />
        <span className="hidden sm:inline">Track order</span>
      </Button>

      <Sheet open={trackOpen} onOpenChange={setTrackOpen}>
        <SheetContent className={`w-full sm:max-w-md ${isDark ? 'bg-zinc-900 text-white border-white/10' : ''}`}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl font-black">
              <PackageSearch className="h-6 w-6 text-amber-500" />
              Order tracker
            </SheetTitle>
            <SheetDescription>Enter the phone number used when placing your order.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Phone number</Label>
              <div className="flex gap-2">
                <Input
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0241234567"
                  inputMode="numeric"
                  onKeyDown={(e) => e.key === 'Enter' && void trackOrdersByPhone()}
                />
                <Button onClick={() => void trackOrdersByPhone()} disabled={trackLoading} className="shrink-0 gap-1">
                  {trackLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Track
                </Button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pb-6">
              {!trackLoading && trackOrders.length === 0 ? (
                <p className={`py-8 text-center text-sm ${mutedText}`}>Enter your contact number to view orders.</p>
              ) : null}
              {trackOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{order.itemLabel}</p>
                      <p className={`mt-0.5 text-xs ${mutedText}`}>{order.network || 'Bundle'}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className={`mt-2 flex justify-between text-xs ${mutedText}`}>
                    <span>
                      GHc {Number(order.amount || 0).toFixed(2)} · {order.phone}
                    </span>
                    <span>{format(new Date(order.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className={`mt-2 text-xs ${mutedText}`}>{order.statusMessage}</p>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(selectedPackage || selectedService)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPackage(null)
            setSelectedService(null)
            setCustomerName('')
            setRecipientPhone('')
          }
        }}
      >
        <DialogContent className={isDark ? 'border-white/10 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900'}>
          <DialogHeader>
            {selectedPackage ? (
              <>
                <div className="mb-1 flex items-center gap-2">
                  <NetworkBadge network={selectedPackage.network} />
                  <span className={`inline-flex items-center gap-1 text-xs ${mutedText}`}>
                    <Clock3 className="h-3.5 w-3.5" /> 1–5 min delivery
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black">
                  {parsePackageGb(selectedPackage.amount)}GB · {formatNetworkLabel(selectedPackage.network)}
                </DialogTitle>
                <p className={`text-sm ${mutedText}`}>
                  GHc {Number(selectedPackage.price || 0).toFixed(2)} · Pay with Mobile Money via Paystack
                </p>
              </>
            ) : selectedService ? (
              <>
                <DialogTitle className="text-2xl font-black">{selectedService.name}</DialogTitle>
                <p className={`text-sm ${mutedText}`}>
                  GHc {Number(selectedService.price || 0).toFixed(2)} · Pay with Mobile Money via Paystack
                </p>
              </>
            ) : null}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedService ? (
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  className={isDark ? 'border-white/10 bg-zinc-800' : 'border-zinc-200 bg-white'}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{selectedService ? 'Phone number' : 'Recipient phone number'}</Label>
              <Input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="0241234567"
                className={isDark ? 'border-white/10 bg-zinc-800' : 'border-zinc-200 bg-white'}
              />
            </div>

            {isAfa ? (
              <>
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={afaFullName} onChange={(e) => setAfaFullName(e.target.value)} className={isDark ? 'border-white/10 bg-zinc-800' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>Ghana Card number</Label>
                  <Input
                    value={afaGhanaCard}
                    onChange={(e) => setAfaGhanaCard(e.target.value.toUpperCase())}
                    placeholder="GHA-123456789-1"
                    className={isDark ? 'border-white/10 bg-zinc-800' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={afaLocation} onChange={(e) => setAfaLocation(e.target.value)} className={isDark ? 'border-white/10 bg-zinc-800' : ''} />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedPackage(null); setSelectedService(null) }}>
              Cancel
            </Button>
            <Button className="bg-amber-400 font-bold text-black hover:bg-amber-300" disabled={submitting} onClick={() => void submitCheckout()}>
              {submitting ? 'Processing...' : 'Proceed to Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
