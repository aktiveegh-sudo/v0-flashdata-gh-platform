'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Wifi, Phone, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useLoadingStore } from '@/lib/store'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type DataPackageRow = {
  id: string
  network: string
  amount: string
  selling_price: number
}

const networkPalette: Record<string, { color: string; textColor: string; borderColor: string }> = {
  MTN: { color: 'bg-yellow-500', textColor: 'text-black', borderColor: 'border-yellow-500' },
  'Airtel-Tigo': { color: 'bg-blue-600', textColor: 'text-white', borderColor: 'border-blue-600' },
  Telecel: { color: 'bg-red-500', textColor: 'text-white', borderColor: 'border-red-500' },
}

function BuyDataContent() {
  const searchParams = useSearchParams()
  const networkParam = searchParams.get('network')

  const [packages, setPackages] = useState<DataPackageRow[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [afaFullName, setAfaFullName] = useState('')
  const [afaGhanaCardNumber, setAfaGhanaCardNumber] = useState('')
  const [afaLocation, setAfaLocation] = useState('')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paystackLoading, setPaystackLoading] = useState(false)

  const { setLoading } = useLoadingStore()

  useEffect(() => {
    const loadPackages = async () => {
      setLoadingPackages(true)

      const { data, error } = await supabase.client
        .from('data_packages')
        .select('id,network,amount,selling_price')
        .eq('is_active', true)
        .order('network', { ascending: true })
        .order('selling_price', { ascending: true })

      if (error) {
        toast.error(error.message)
        setPackages([])
        setLoadingPackages(false)
        return
      }

      const rows = ((data as DataPackageRow[] | null) || []).map((row) => ({
        ...row,
        selling_price: Number(row.selling_price || 0),
      }))

      setPackages(rows)

      const availableNetworks = Array.from(new Set(rows.map((row) => row.network).filter(Boolean)))
      if (availableNetworks.length > 0) {
        const preferred = networkParam && availableNetworks.includes(networkParam) ? networkParam : availableNetworks[0]
        setSelectedNetwork(preferred)
      }

      setLoadingPackages(false)
    }

    void loadPackages()
  }, [networkParam])

  const networks = useMemo(
    () => Array.from(new Set(packages.map((pkg) => pkg.network).filter(Boolean))),
    [packages]
  )

  const currentPackages = useMemo(() => {
    if (!selectedNetwork) return []
    return packages.filter((pkg) => pkg.network === selectedNetwork)
  }, [packages, selectedNetwork])

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) || null,
    [packages, selectedPackageId]
  )

  const isAfaRegistration = useMemo(
    () => (selectedPackage?.network || '').trim().toUpperCase() === 'AFA',
    [selectedPackage?.network]
  )

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

  const handleStartCheckout = (packageId: string) => {
    setSelectedPackageId(packageId)
    setPhoneNumber('')
    setAfaFullName('')
    setAfaGhanaCardNumber('')
    setAfaLocation('')
    setIsCheckoutOpen(true)
  }

  const handlePaystackCheckout = async () => {
    const normalizedPhone = normalizeToGhanaPhone(phoneNumber)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    if (!selectedPackage) {
      toast.error('Please select a data package')
      return
    }

    setPaystackLoading(true)
    setLoading(true)

    try {
      if (isAfaRegistration) {
        if (!afaFullName.trim() || !afaGhanaCardNumber.trim() || !afaLocation.trim()) {
          toast.error('Complete all AFA registration fields')
          setPaystackLoading(false)
          setLoading(false)
          return
        }

        await startPaystackCheckout({
          flow: 'dashboard_afa',
          phone: normalizedPhone,
          fullName: afaFullName.trim(),
          ghanaCardNumber: afaGhanaCardNumber.trim().toUpperCase(),
          location: afaLocation.trim(),
          redirectPath: '/dashboard/afa',
        })
        return
      }

      await startPaystackCheckout({
        flow: 'dashboard_data',
        packageId: selectedPackage.id,
        phone: normalizedPhone,
        redirectPath: '/dashboard/buy-data',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start Paystack payment')
      setPaystackLoading(false)
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Buy Data</h1>
        <p className="text-muted-foreground">Choose a network, pick a bundle, and pay securely</p>
      </div>

      {loadingPackages ? (
        <Card>
          <CardContent className="flex min-h-[180px] items-center justify-center gap-2 p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading packages...
          </CardContent>
        </Card>
      ) : networks.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No data packages available yet. Admin will add packages shortly.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {networks.map((network) => {
              const style = networkPalette[network] || { color: 'bg-slate-700', textColor: 'text-white', borderColor: 'border-slate-700' }

              return (
                <button
                  key={network}
                  onClick={() => {
                    setSelectedNetwork(network)
                    setSelectedPackageId('')
                  }}
                  className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedNetwork === network
                      ? `${style.color} ${style.textColor} ${style.borderColor}`
                      : 'border-border bg-card text-foreground hover:border-primary/50'
                  }`}
                >
                  <Wifi className="h-4 w-4" />
                  {network}
                </button>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Package</CardTitle>
              </CardHeader>
              <CardContent>
                {currentPackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No packages available for this network.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {currentPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handleStartCheckout(pkg.id)}
                        type="button"
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                          selectedPackageId === pkg.id
                            ? `${networkPalette[pkg.network]?.borderColor || 'border-primary'} ${networkPalette[pkg.network]?.color || 'bg-primary'} ${networkPalette[pkg.network]?.textColor || 'text-white'}`
                            : `${networkPalette[pkg.network]?.borderColor || 'border-border'} ${networkPalette[pkg.network]?.color || 'bg-card'} ${networkPalette[pkg.network]?.textColor || 'text-foreground'} opacity-90 hover:opacity-100`
                        }`}
                      >
                        {selectedPackageId === pkg.id ? (
                          <div className="absolute right-2 top-2">
                            <Check className={`h-5 w-5 ${networkPalette[pkg.network]?.textColor || 'text-primary'}`} />
                          </div>
                        ) : null}
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{pkg.network}</p>
                        <p className="text-xl font-bold">{pkg.amount}</p>
                        <p className="text-lg font-semibold">GHc {pkg.selling_price.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Pick your network</p>
                <p>2. Tap a package card</p>
                <p>3. Enter required details in popup</p>
                <p>4. Pay on Paystack and return for verification</p>
                <p>5. Your order is created only after payment is verified</p>
                <p className="pt-2 text-xs">Packages are managed by admins only.</p>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Data Purchase</DialogTitle>
                <DialogDescription>
                  {selectedPackage
                    ? `${selectedPackage.network} ${selectedPackage.amount} - GHc ${selectedPackage.selling_price.toFixed(2)}`
                    : 'Select a package to continue'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{isAfaRegistration ? 'Phone Number' : 'Recipient Phone Number'}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="024 123 4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isAfaRegistration ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="afa-full-name">Full Name</Label>
                      <Input
                        id="afa-full-name"
                        value={afaFullName}
                        onChange={(e) => setAfaFullName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="afa-ghana-card">Ghana Card Number</Label>
                      <Input
                        id="afa-ghana-card"
                        value={afaGhanaCardNumber}
                        onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())}
                        placeholder="GHA-123456789-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="afa-location">Location</Label>
                      <Input
                        id="afa-location"
                        value={afaLocation}
                        onChange={(e) => setAfaLocation(e.target.value)}
                        placeholder="Enter your location"
                      />
                    </div>
                  </>
                ) : null}

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <Badge>{selectedPackage?.network || 'Not selected'}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium">{selectedPackage ? selectedPackage.amount : 'Not selected'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">GHc {(selectedPackage?.selling_price || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-muted-foreground">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">You will be redirected to Paystack. The order reaches admin only after payment verification succeeds.</span>
                </div>

                <div className="grid gap-2">
                  <Button
                    onClick={() => void handlePaystackCheckout()}
                    className="w-full"
                    size="lg"
                    disabled={
                      !phoneNumber ||
                      !selectedPackage ||
                      paystackLoading ||
                      (isAfaRegistration && (!afaFullName.trim() || !afaGhanaCardNumber.trim() || !afaLocation.trim()))
                    }
                  >
                    {paystackLoading ? 'Redirecting...' : 'Pay with Paystack'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  )
}

export default function BuyDataPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center">Loading...</div>}>
      <BuyDataContent />
    </Suspense>
  )
}
