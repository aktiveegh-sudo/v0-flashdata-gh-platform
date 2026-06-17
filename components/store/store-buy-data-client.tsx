'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startPaystackCheckout } from '@/lib/paystack/client'
import { compareNetworks, networkCardTheme, sortNetworks } from '@/lib/network-order'
import type { StoreRecord } from '@/lib/store-tenant'
import toast from 'react-hot-toast'

type StoreBuyDataClientProps = {
  store: StoreRecord
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export function StoreBuyDataClient({ store }: StoreBuyDataClientProps) {
  const orderedStorePackages = useMemo(
    () =>
      [...store.dataPackages].sort((a, b) => {
        const networkComparison = compareNetworks(a.network, b.network)
        if (networkComparison !== 0) return networkComparison
        return Number(a.price || 0) - Number(b.price || 0)
      }),
    [store.dataPackages]
  )

  const [activeNetwork, setActiveNetwork] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [ghanaCardNumber, setGhanaCardNumber] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedPackage = useMemo(
    () => orderedStorePackages.find((item) => item.id === selectedPackageId) || null,
    [orderedStorePackages, selectedPackageId]
  )

  const networkTabs = useMemo(() => {
    const items = new Set<string>()
    for (const pkg of orderedStorePackages) {
      if (pkg.network) items.add(pkg.network)
    }
    return sortNetworks(Array.from(items))
  }, [orderedStorePackages])

  useEffect(() => {
    if (!activeNetwork && networkTabs.length > 0) {
      setActiveNetwork(networkTabs[0])
    }
  }, [activeNetwork, networkTabs])

  const visiblePackages = useMemo(() => {
    if (!activeNetwork) return orderedStorePackages
    return orderedStorePackages.filter((item) => item.network === activeNetwork)
  }, [activeNetwork, orderedStorePackages])

  const isAfa = (selectedPackage?.network || '').trim().toUpperCase() === 'AFA'

  const openCheckout = (packageId: string) => {
    setSelectedPackageId(packageId)
    setRecipientPhone('')
    setFullName('')
    setGhanaCardNumber('')
    setLocation('')
  }

  const submitCheckout = async () => {
    if (!selectedPackage) return
    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient number')
      return
    }

    if (isAfa) {
      const cardPattern = /^GHA-\d{9}-\d$/i
      if (!fullName.trim() || !location.trim() || !cardPattern.test(ghanaCardNumber.trim())) {
        toast.error('Provide valid full name, location, and Ghana Card number')
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
        fullName: isAfa ? fullName.trim() : undefined,
        ghanaCardNumber: isAfa ? ghanaCardNumber.trim().toUpperCase() : undefined,
        location: isAfa ? location.trim() : undefined,
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Buy Data Bundles</p>
        <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Pick your network and bundle</h2>
        <p className="mt-2 text-sm text-zinc-300">No account needed. Fast checkout and instant delivery updates.</p>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Important: avoid duplicate orders</p>
          <p className="mt-1 text-xs text-amber-100/90">Do not submit multiple payments to the same number at once.</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Orders are moving well</p>
          <p className="mt-1 text-xs text-emerald-100/90">Most deliveries complete quickly after payment verification.</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {networkTabs.map((network) => (
          <Button
            key={network}
            variant={activeNetwork === network ? 'default' : 'outline'}
            onClick={() => setActiveNetwork(network)}
            className={
              activeNetwork === network
                ? 'rounded-full bg-yellow-300 px-5 text-xs font-semibold uppercase tracking-[0.11em] text-black hover:bg-yellow-200'
                : 'rounded-full border-yellow-300/35 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-200 hover:bg-yellow-300/10'
            }
          >
            {network}
          </Button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePackages.map((item) => (
          <Card key={item.id} className={`rounded-2xl border ${networkCardTheme(item.network).card}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-3xl font-black leading-none">{item.amount || item.name}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${networkCardTheme(item.network).badge}`}>{item.network}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{item.name}</p>
              <p className="mt-2 text-sm">{item.validity}</p>
              <p className="mt-4 text-3xl font-black">{formatGhs(item.price)}</p>
              <Button className={`mt-4 w-full rounded-full ${networkCardTheme(item.network).button}`} onClick={() => openCheckout(item.id)}>
                Buy
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackageId(null)}>
        <DialogContent className="border-yellow-300/25 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{isAfa ? 'Complete AFA bundle order' : 'Complete data order'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Recipient Number</Label>
              <Input
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="0241234567"
                className="border-yellow-300/25 bg-zinc-900"
              />
            </div>

            {isAfa ? (
              <>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} className="border-yellow-300/25 bg-zinc-900" />
                </div>
                <div className="space-y-2">
                  <Label>Ghana Card Number</Label>
                  <Input
                    value={ghanaCardNumber}
                    onChange={(event) => setGhanaCardNumber(event.target.value.toUpperCase())}
                    placeholder="GHA-123456789-1"
                    className="border-yellow-300/25 bg-zinc-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(event) => setLocation(event.target.value)} className="border-yellow-300/25 bg-zinc-900" />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-yellow-300/35 bg-transparent text-zinc-100 hover:bg-yellow-300/10" onClick={() => setSelectedPackageId(null)}>
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
