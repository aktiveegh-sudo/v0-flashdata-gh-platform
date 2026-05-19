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
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

type DataPackageRow = {
  id: string
  network: string
  name: string
  amount: string
  selling_price: number
  validity: string
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const { balance, deductFunds } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { setLoading } = useLoadingStore()

  useEffect(() => {
    const loadPackages = async () => {
      setLoadingPackages(true)

      const { data, error } = await supabase.client
        .from('data_packages')
        .select('id,network,name,amount,selling_price,validity')
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

  const handleBuyData = async () => {
    const normalizedPhone = normalizeToGhanaPhone(phoneNumber)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    if (!selectedPackage) {
      toast.error('Please select a data package')
      return
    }

    if (balance < selectedPackage.selling_price) {
      toast.error('Insufficient wallet balance. Please top up your wallet.')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      return
    }

    setLoading(true)

    const reference = `FD-${selectedPackage.network.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const { error } = await supabase.client.from('orders').insert({
      user_id: authData.user.id,
      package_id: selectedPackage.id,
      phone: normalizedPhone,
      amount: selectedPackage.selling_price,
      status: 'pending',
      reference,
    })

    if (error) {
      setLoading(false)
      toast.error(error.message || 'Could not place data order')
      return
    }

    const debited = deductFunds(selectedPackage.selling_price)
    if (debited) {
      addTransaction({
        type: 'data',
        network: selectedPackage.network,
        amount: selectedPackage.selling_price,
        phone: normalizedPhone,
        status: 'pending',
        reference,
        description: `${selectedPackage.amount} ${selectedPackage.network} Data Bundle`,
      })
    }

    toast.success(
      <div>
        <p className="font-semibold">Order submitted successfully</p>
        <p className="text-sm">Ref: {reference}</p>
      </div>
    )

    setPhoneNumber('')
    setSelectedPackageId('')
    setIsCheckoutOpen(false)
    setLoading(false)
  }

  const handleStartCheckout = (packageId: string) => {
    setSelectedPackageId(packageId)
    setPhoneNumber('')
    setIsCheckoutOpen(true)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Buy Data</h1>
        <p className="text-muted-foreground">Live admin-managed data packages only</p>
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
                        <p className="text-xl font-bold">{pkg.amount}</p>
                        <p className="text-lg font-semibold">GHc {pkg.selling_price.toFixed(2)}</p>
                        <p className="text-xs opacity-90">{pkg.name} &middot; {pkg.validity}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Pick your network</p>
                <p>2. Tap a package card</p>
                <p>3. Enter recipient number in popup</p>
                <p>4. Confirm and pay</p>
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
                    ? `${selectedPackage.network} ${selectedPackage.amount} (${selectedPackage.name})`
                    : 'Select a package to continue'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient Phone Number</Label>
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

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <Badge>{selectedPackage?.network || 'Not selected'}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium">{selectedPackage ? `${selectedPackage.amount} (${selectedPackage.name})` : 'Not selected'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">GHc {(selectedPackage?.selling_price || 0).toFixed(2)}</span>
                  </div>
                </div>

                {balance < (selectedPackage?.selling_price || 0) ? (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">Insufficient balance. Wallet: GHc {balance.toFixed(2)}</span>
                  </div>
                ) : null}

                <Button
                  onClick={handleBuyData}
                  className="w-full"
                  size="lg"
                  disabled={!phoneNumber || !selectedPackage || balance < (selectedPackage?.selling_price || 0)}
                >
                  Pay Now
                </Button>
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
