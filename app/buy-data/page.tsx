'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import { compareNetworks, networkCardTheme, sortNetworks } from '@/lib/network-order'
import toast from 'react-hot-toast'

type PublicPackage = {
  id: string
  network: string
  name: string
  amount: string
  public_price: number
  selling_price?: number
  is_active: boolean
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export default function PublicBuyDataPage() {
  const [packages, setPackages] = useState<PublicPackage[]>([])
  const [activeNetwork, setActiveNetwork] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<PublicPackage | null>(null)
  const [open, setOpen] = useState(false)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [afaFullName, setAfaFullName] = useState('')
  const [afaGhanaCardNumber, setAfaGhanaCardNumber] = useState('')
  const [afaLocation, setAfaLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.client
        .from('data_packages')
        .select('id,network,name,amount,public_price,is_active')
        .eq('is_active', true)
        .order('network', { ascending: true })
        .order('public_price', { ascending: true })

      const list = (((data as PublicPackage[] | null) || []).map((item) => ({
        ...item,
        public_price: Number(item.public_price || item.selling_price || 0),
      }))).sort((a, b) => {
        const networkComparison = compareNetworks(a.network, b.network)
        if (networkComparison !== 0) return networkComparison
        return Number(a.public_price || 0) - Number(b.public_price || 0)
      })

      setPackages(list)
      setActiveNetwork(list.find((pkg) => pkg.network)?.network || '')
      setLoading(false)
    }

    void load()
  }, [])

  const networks = useMemo(() => {
    const uniq = new Set<string>()
    for (const pkg of packages) {
      if (pkg.network) uniq.add(pkg.network)
    }
    return sortNetworks(Array.from(uniq))
  }, [packages])

  const filtered = useMemo(() => {
    if (!activeNetwork) return packages
    return packages.filter((pkg) => pkg.network === activeNetwork)
  }, [activeNetwork, packages])

  const isAfa = (selectedPackage?.network || '').toUpperCase() === 'AFA'

  const openCheckout = (pkg: PublicPackage) => {
    setSelectedPackage(pkg)
    setRecipientPhone('')
    setAfaFullName('')
    setAfaGhanaCardNumber('')
    setAfaLocation('')
    setOpen(true)
  }

  const submit = async () => {
    if (!selectedPackage) return
    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient phone')
      return
    }

    if (isAfa) {
      if (!afaFullName.trim() || !afaLocation.trim()) {
        toast.error('Please complete AFA details')
        return
      }
      const ghanaCardPattern = /^GHA-\d{9}-\d$/i
      if (!ghanaCardPattern.test(afaGhanaCardNumber.trim())) {
        toast.error('Enter valid Ghana Card Number (GHA-123456789-1)')
        return
      }
    }

    setSubmitting(true)
    try {
      await startPaystackCheckout({
        flow: isAfa ? 'public_afa' : 'public_data',
        packageId: selectedPackage.id,
        phone: recipientPhone.trim(),
        fullName: isAfa ? afaFullName.trim() : undefined,
        ghanaCardNumber: isAfa ? afaGhanaCardNumber.trim().toUpperCase() : undefined,
        location: isAfa ? afaLocation.trim() : undefined,
        redirectPath: '/buy-data',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start checkout')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <MainSiteShell activeTab="buy-data">
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading packages...
          </div>
        </div>
      </MainSiteShell>
    )
  }

  if (packages.length === 0) {
    return (
      <MainSiteShell activeTab="buy-data">
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <Card className="max-w-md border-gray-200 bg-white dark:border-white/8 dark:bg-white/[0.03]">
            <CardContent className="p-6 text-center text-gray-600 dark:text-white/70">
              No active public packages available yet.
            </CardContent>
          </Card>
        </div>
      </MainSiteShell>
    )
  }

  return (
    <MainSiteShell activeTab="buy-data">
      <section className="px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Buy Data Bundles</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">No account needed. Pay via MoMo.</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-500 dark:text-white/55">
            Choose your network, pick a bundle, and pay securely with Paystack. Delivery in 10 to 60 minutes.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Important: No duplicate orders
              </p>
              <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-100/90">
                Placing more than one order for the same phone number within 5 minutes may cause rejection.
              </p>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-800 dark:text-violet-200">
              <p className="flex items-center gap-2 font-semibold">
                <Search className="h-4 w-4" /> Track your order
              </p>
              <p className="mt-1 text-xs text-violet-700/90 dark:text-violet-100/90">
                Check delivery status by phone or reference on the Track Order page.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Deliveries are moving well
              </p>
              <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-100/90">
                Expect your order within the hour for most bundles.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {networks.map((network) => (
              <Button
                key={network}
                variant={activeNetwork === network ? 'default' : 'outline'}
                className={
                  activeNetwork === network
                    ? 'rounded-full bg-amber-400 px-5 text-xs font-bold uppercase tracking-wide text-black hover:bg-amber-300'
                    : 'rounded-full border-gray-200 bg-white px-5 text-xs font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80'
                }
                onClick={() => setActiveNetwork(network)}
              >
                {network}
              </Button>
            ))}
          </div>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((pkg) => (
              <Card key={pkg.id} className={`rounded-2xl border shadow-sm ${networkCardTheme(pkg.network).card}`}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{pkg.network}</p>
                    <div className={`rounded-full px-2 py-1 text-[10px] font-bold ${networkCardTheme(pkg.network).badge}`}>
                      {pkg.amount}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black">{pkg.name}</h2>
                  <p className="text-xs uppercase tracking-[0.1em] text-gray-500 dark:text-white/45">{pkg.network} Bundle</p>
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{formatGhs(pkg.public_price)}</p>
                  <Button className={`w-full rounded-full ${networkCardTheme(pkg.network).button}`} onClick={() => openCheckout(pkg)}>
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a110d]">
          <DialogHeader>
            <DialogTitle>{isAfa ? 'Complete AFA registration' : 'Complete your data order'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0241234567" />
            </div>
            {isAfa ? (
              <>
                <div className="space-y-2"><Label>Full Name</Label><Input value={afaFullName} onChange={(e) => setAfaFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Ghana Card Number</Label><Input value={afaGhanaCardNumber} onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())} placeholder="GHA-123456789-1" /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={afaLocation} onChange={(e) => setAfaLocation(e.target.value)} /></div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-amber-400 text-black hover:bg-amber-300" onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Processing...' : 'Proceed to Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainSiteShell>
  )
}
