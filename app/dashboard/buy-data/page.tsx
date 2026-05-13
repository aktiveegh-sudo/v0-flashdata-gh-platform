'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Phone, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const networks = [
  { id: 'mtn', name: 'MTN', color: 'bg-yellow-500', textColor: 'text-black', borderColor: 'border-yellow-500' },
  { id: 'airtel-tigo', name: 'Airtel-Tigo', color: 'bg-red-500', textColor: 'text-white', borderColor: 'border-red-500' },
  { id: 'telecel', name: 'Telecel', color: 'bg-blue-600', textColor: 'text-white', borderColor: 'border-blue-600' },
  { id: 'afa', name: 'AFA Registration', color: 'bg-green-600', textColor: 'text-white', borderColor: 'border-green-600' },
]

const dataPackages: Record<string, { amount: string; price: number; validity: string }[]> = {
  mtn: [
    { amount: '1GB', price: 5.00, validity: '30 days' },
    { amount: '2GB', price: 10.00, validity: '30 days' },
    { amount: '3GB', price: 14.00, validity: '30 days' },
    { amount: '5GB', price: 22.00, validity: '30 days' },
    { amount: '10GB', price: 40.00, validity: '30 days' },
    { amount: '15GB', price: 55.00, validity: '30 days' },
    { amount: '20GB', price: 70.00, validity: '30 days' },
    { amount: '50GB', price: 150.00, validity: '30 days' },
  ],
  'airtel-tigo': [
    { amount: '500MB', price: 2.50, validity: '7 days' },
    { amount: '1GB', price: 4.50, validity: '30 days' },
    { amount: '2GB', price: 9.00, validity: '30 days' },
    { amount: '5GB', price: 20.00, validity: '30 days' },
    { amount: '10GB', price: 38.00, validity: '30 days' },
    { amount: '20GB', price: 65.00, validity: '30 days' },
  ],
  telecel: [
    { amount: '1GB', price: 5.00, validity: '30 days' },
    { amount: '2GB', price: 9.00, validity: '30 days' },
    { amount: '5GB', price: 21.00, validity: '30 days' },
    { amount: '10GB', price: 39.00, validity: '30 days' },
    { amount: '15GB', price: 52.00, validity: '30 days' },
  ],
}

function BuyDataContent() {
  const searchParams = useSearchParams()
  const networkParam = searchParams.get('network')
  
  const [selectedNetwork, setSelectedNetwork] = useState(networkParam || 'mtn')
  const [selectedPackage, setSelectedPackage] = useState<typeof dataPackages.mtn[0] | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  
  // AFA Registration fields
  const [afaName, setAfaName] = useState('')
  const [afaIdNumber, setAfaIdNumber] = useState('')
  
  const { balance, deductFunds } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { setLoading } = useLoadingStore()

  useEffect(() => {
    if (networkParam) {
      setSelectedNetwork(networkParam)
    }
  }, [networkParam])

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value))
  }

  const handleBuyData = async () => {
    if (!phoneNumber || phoneNumber.replace(/\s/g, '').length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }

    const price = isCustom ? parseFloat(customAmount) : selectedPackage?.price
    if (!price || price <= 0) {
      toast.error('Please select a data package or enter a valid amount')
      return
    }

    if (balance < price) {
      toast.error('Insufficient wallet balance. Please top up your wallet.')
      return
    }

    setLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const success = deductFunds(price)
    if (success) {
      const networkName = networks.find((n) => n.id === selectedNetwork)?.name || selectedNetwork
      const reference = `FD-${networkName.toUpperCase().replace('-', '').slice(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      addTransaction({
        type: 'data',
        network: networkName,
        amount: price,
        phone: phoneNumber.replace(/\s/g, ''),
        status: 'success',
        reference,
        description: isCustom ? `GH₵${price} ${networkName} Data Bundle` : `${selectedPackage?.amount} ${networkName} Data Bundle`,
      })

      toast.success(
        <div>
          <p className="font-semibold">Data purchase successful!</p>
          <p className="text-sm">Ref: {reference}</p>
        </div>
      )
      
      // Reset form
      setPhoneNumber('')
      setSelectedPackage(null)
      setCustomAmount('')
      setIsCustom(false)
    } else {
      toast.error('Transaction failed. Please try again.')
    }

    setLoading(false)
  }

  const handleAFARegistration = async () => {
    if (!phoneNumber || !afaName || !afaIdNumber) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    const reference = `FD-AFA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    addTransaction({
      type: 'data',
      network: 'MTN AFA',
      amount: 0,
      phone: phoneNumber.replace(/\s/g, ''),
      status: 'success',
      reference,
      description: `AFA Registration for ${afaName}`,
    })

    toast.success(
      <div>
        <p className="font-semibold">AFA Registration successful!</p>
        <p className="text-sm">Ref: {reference}</p>
      </div>
    )
    
    setPhoneNumber('')
    setAfaName('')
    setAfaIdNumber('')
    setLoading(false)
  }

  const currentPackages = dataPackages[selectedNetwork] || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Buy Data</h1>
        <p className="text-muted-foreground">Purchase data bundles for any network</p>
      </div>

      {/* Network Tabs */}
      <div className="flex flex-wrap gap-2">
        {networks.map((network) => (
          <button
            key={network.id}
            onClick={() => {
              setSelectedNetwork(network.id)
              setSelectedPackage(null)
              setIsCustom(false)
            }}
            className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
              selectedNetwork === network.id
                ? `${network.color} ${network.textColor} ${network.borderColor}`
                : 'border-border bg-card text-foreground hover:border-primary/50'
            }`}
          >
            <Wifi className="h-4 w-4" />
            {network.name}
          </button>
        ))}
      </div>

      {/* Content based on selected network */}
      <AnimatePresence mode="wait">
        {selectedNetwork === 'afa' ? (
          <motion.div
            key="afa"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white">
                    <Wifi className="h-5 w-5" />
                  </div>
                  MTN AFA Bundle Registration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Register for MTN&apos;s Affordable For All (AFA) data bundle. This special bundle
                    offers discounted data rates for eligible customers.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="afaName">Full Name</Label>
                  <Input
                    id="afaName"
                    placeholder="Enter your full name"
                    value={afaName}
                    onChange={(e) => setAfaName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="afaPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="afaPhone"
                      type="tel"
                      placeholder="024 123 4567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="afaId">Ghana Card Number</Label>
                  <Input
                    id="afaId"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={afaIdNumber}
                    onChange={(e) => setAfaIdNumber(e.target.value.toUpperCase())}
                  />
                </div>

                <Button onClick={handleAFARegistration} className="w-full" size="lg">
                  Register for AFA Bundle
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={selectedNetwork}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Data Packages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Package</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCustom(!isCustom)
                      setSelectedPackage(null)
                    }}
                  >
                    {isCustom ? 'Choose Package' : 'Custom Amount'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCustom ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customAmount">Enter Amount (GH₵)</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {currentPackages.map((pkg) => (
                      <button
                        key={pkg.amount}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                          selectedPackage?.amount === pkg.amount
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {selectedPackage?.amount === pkg.amount && (
                          <div className="absolute right-2 top-2">
                            <Check className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <p className="text-2xl font-bold text-foreground">{pkg.amount}</p>
                        <p className="text-lg font-semibold text-primary">
                          GH₵ {pkg.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{pkg.validity}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Form */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Purchase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="024 123 4567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <Badge className={networks.find((n) => n.id === selectedNetwork)?.color}>
                      {networks.find((n) => n.id === selectedNetwork)?.name}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium">
                      {isCustom ? `Custom (GH₵${customAmount || '0'})` : selectedPackage?.amount || 'Not selected'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">
                      GH₵ {(isCustom ? parseFloat(customAmount) || 0 : selectedPackage?.price || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Wallet Balance Warning */}
                {balance < (isCustom ? parseFloat(customAmount) || 0 : selectedPackage?.price || 0) && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">
                      Insufficient balance. Your wallet has GH₵ {balance.toFixed(2)}
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleBuyData}
                  className="w-full"
                  size="lg"
                  disabled={
                    !phoneNumber ||
                    (!selectedPackage && !customAmount) ||
                    balance < (isCustom ? parseFloat(customAmount) || 0 : selectedPackage?.price || 0)
                  }
                >
                  Buy Data Now
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By proceeding, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BuyDataPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
      <BuyDataContent />
    </Suspense>
  )
}
