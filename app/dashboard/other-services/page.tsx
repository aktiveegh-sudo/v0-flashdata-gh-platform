'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Tv, Phone, Radio, Wifi, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const services = [
  {
    id: 'electricity',
    name: 'Electricity Bills',
    description: 'Pay ECG and other electricity bills',
    icon: Zap,
    color: 'bg-yellow-500',
    providers: ['ECG Prepaid', 'ECG Postpaid', 'NEDCo'],
  },
  {
    id: 'tv',
    name: 'TV Subscriptions',
    description: 'Renew your TV subscription',
    icon: Tv,
    color: 'bg-purple-500',
    providers: ['DStv', 'GOtv', 'StarTimes'],
  },
  {
    id: 'airtime',
    name: 'Airtime',
    description: 'Buy airtime for any network',
    icon: Phone,
    color: 'bg-green-500',
    providers: ['MTN', 'Airtel-Tigo', 'Telecel'],
  },
  {
    id: 'cable',
    name: 'Cable TV',
    description: 'Pay cable TV subscriptions',
    icon: Radio,
    color: 'bg-blue-500',
    providers: ['MultiTV', 'SurfLine'],
  },
  {
    id: 'internet',
    name: 'Internet',
    description: 'Pay for broadband internet',
    icon: Wifi,
    color: 'bg-teal-500',
    providers: ['Busy Internet', 'Vodafone Broadband', 'MTN Fiber'],
  },
  {
    id: 'other',
    name: 'Other Payments',
    description: 'Insurance, school fees, and more',
    icon: CreditCard,
    color: 'bg-orange-500',
    providers: ['Insurance', 'School Fees', 'Other'],
  },
]

export default function OtherServicesPage() {
  const { balance, deductFunds } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { setLoading } = useLoadingStore()
  
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    provider: '',
    accountNumber: '',
    amount: '',
    phone: '',
  })

  const handleSelectService = (service: typeof services[0]) => {
    setSelectedService(service)
    setFormData({
      provider: '',
      accountNumber: '',
      amount: '',
      phone: '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.provider || !formData.accountNumber || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (balance < amount) {
      toast.error('Insufficient wallet balance')
      return
    }

    setIsDialogOpen(false)
    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const success = deductFunds(amount)
    if (success) {
      const reference = `FD-${selectedService?.id.toUpperCase().slice(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      addTransaction({
        type: 'bill',
        amount,
        status: 'success',
        reference,
        description: `${formData.provider} - ${selectedService?.name}`,
      })

      toast.success(
        <div>
          <p className="font-semibold">Payment successful!</p>
          <p className="text-sm">Ref: {reference}</p>
        </div>
      )
    } else {
      toast.error('Payment failed. Please try again.')
    }

    setLoading(false)
    setSelectedService(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Other Online Services</h1>
        <p className="text-muted-foreground">Pay bills and purchase various services</p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
              onClick={() => handleSelectService(service)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.color} text-white`}
                  >
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedService && (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedService.color} text-white`}
                >
                  <selectedService.icon className="h-4 w-4" />
                </div>
              )}
              {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to make a payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {selectedService?.providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                {selectedService?.id === 'electricity'
                  ? 'Meter Number'
                  : selectedService?.id === 'tv' || selectedService?.id === 'cable'
                  ? 'Smart Card Number'
                  : selectedService?.id === 'airtime'
                  ? 'Phone Number'
                  : 'Account Number'}
              </Label>
              <Input
                id="accountNumber"
                placeholder="Enter number"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GH₵)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (for receipt)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="024 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {formData.amount && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">GH₵ {parseFloat(formData.amount || '0').toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className={balance < parseFloat(formData.amount || '0') ? 'text-destructive' : ''}>
                    GH₵ {balance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                !formData.provider ||
                !formData.accountNumber ||
                !formData.amount ||
                balance < parseFloat(formData.amount || '0')
              }
            >
              Pay GH₵ {parseFloat(formData.amount || '0').toFixed(2)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
