'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Banknote, Smartphone, Building2, CheckCircle } from 'lucide-react'
import { DashboardPageShell, DashboardPanel } from '@/components/dashboard/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const paymentMethods = [
  { id: 'mtn-momo', name: 'MTN Mobile Money', icon: Smartphone },
  { id: 'telecel-cash', name: 'Telecel Cash', icon: Smartphone },
  { id: 'bank', name: 'Bank Transfer', icon: Building2 },
]

const banks = [
  'GCB Bank',
  'Ecobank Ghana',
  'Fidelity Bank',
  'Absa Bank Ghana',
  'Access Bank Ghana',
  'Stanbic Bank Ghana',
  'Standard Chartered Ghana',
  'CalBank',
  'Zenith Bank Ghana',
]

export default function WithdrawalPage() {
  const { balance, deductFunds } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { setLoading } = useLoadingStore()
  
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [momoNumber, setMomoNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [reference, setReference] = useState('')

  const availableBalance = balance
  const minWithdrawal = 10
  const maxWithdrawal = 5000

  const handleSubmit = async () => {
    const withdrawAmount = parseFloat(amount)

    if (!withdrawAmount || withdrawAmount < minWithdrawal) {
      toast.error(`Minimum withdrawal is GH₵ ${minWithdrawal}`)
      return
    }

    if (withdrawAmount > availableBalance) {
      toast.error('Insufficient balance')
      return
    }

    if (withdrawAmount > maxWithdrawal) {
      toast.error(`Maximum withdrawal is GH₵ ${maxWithdrawal}`)
      return
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    if (paymentMethod === 'bank' && (!bankName || !accountNumber || !accountName)) {
      toast.error('Please fill in all bank details')
      return
    }

    if ((paymentMethod === 'mtn-momo' || paymentMethod === 'telecel-cash') && !momoNumber) {
      toast.error('Please enter your mobile money number')
      return
    }

    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 2500))

    const success = deductFunds(withdrawAmount)
    if (success) {
      const ref = `FD-WDR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      setReference(ref)
      
      addTransaction({
        type: 'withdrawal',
        amount: withdrawAmount,
        status: 'pending',
        reference: ref,
        description: `Withdrawal to ${paymentMethods.find((m) => m.id === paymentMethod)?.name}`,
      })

      setShowSuccess(true)
    } else {
      toast.error('Withdrawal failed. Please try again.')
    }

    setLoading(false)
  }

  const resetForm = () => {
    setAmount('')
    setPaymentMethod('')
    setMomoNumber('')
    setBankName('')
    setAccountNumber('')
    setAccountName('')
    setShowSuccess(false)
    setReference('')
  }

  if (showSuccess) {
    return (
      <DashboardPageShell title="Cash Out" description="Your withdrawal request was submitted.">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-[40vh] items-center justify-center"
        >
          <DashboardPanel className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            >
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Withdrawal Requested!</h2>
            <p className="mt-2 text-gray-500 dark:text-white/55">
              Your withdrawal request has been submitted successfully.
            </p>
            <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-sm text-gray-500 dark:text-white/50">Reference Number</p>
              <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">{reference}</p>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-white/55">
              You will receive your funds within 24 hours.
            </p>
            <Button className="mt-6 w-full" onClick={resetForm}>
              Make Another Withdrawal
            </Button>
          </DashboardPanel>
        </motion.div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Cash Out"
      description="Send money from your wallet to mobile money or bank."
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardPanel title="Available Balance" className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">GH₵ {availableBalance.toFixed(2)}</p>
          <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-white/55">
              <div className="flex justify-between">
                <span>Minimum withdrawal</span>
                <span>GH₵ {minWithdrawal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Maximum withdrawal</span>
                <span>GH₵ {maxWithdrawal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing time</span>
                <span>Within 24 hours</span>
              </div>
            </div>
        </DashboardPanel>

        <DashboardPanel title="Request Withdrawal" className="lg:col-span-2">
          <div className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GH₵)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 500].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(amt.toString())}
                    className={amount === amt.toString() ? 'border-primary bg-primary/10' : ''}
                  >
                    GH₵ {amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <method.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Fields */}
            {(paymentMethod === 'mtn-momo' || paymentMethod === 'telecel-cash') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <Label htmlFor="momoNumber">Mobile Money Number</Label>
                <Input
                  id="momoNumber"
                  type="tel"
                  placeholder="024 123 4567"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                />
              </motion.div>
            )}

            {/* Bank Fields */}
            {paymentMethod === 'bank' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Enter account name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {/* Summary */}
            {amount && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Withdrawal Amount</span>
                  <span className="font-semibold">GH₵ {parseFloat(amount || '0').toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-medium">You&apos;ll Receive</span>
                  <span className="text-xl font-bold text-primary">
                    GH₵ {parseFloat(amount || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={
                !amount ||
                parseFloat(amount) < minWithdrawal ||
                parseFloat(amount) > availableBalance ||
                !paymentMethod
              }
            >
              Request Withdrawal
            </Button>
          </div>
        </DashboardPanel>
      </div>
    </motion.div>
    </DashboardPageShell>
  )
}
