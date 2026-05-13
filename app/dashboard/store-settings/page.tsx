'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Upload, Store, Phone, Mail, Building2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const banks = [
  'GCB Bank',
  'Ecobank Ghana',
  'Fidelity Bank',
  'Absa Bank Ghana',
  'Access Bank Ghana',
  'Stanbic Bank Ghana',
]

export default function StoreSettingsPage() {
  const { setLoading } = useLoadingStore()
  
  const [formData, setFormData] = useState({
    storeName: 'FlashData Store',
    description: 'Your trusted partner for data bundles and airtime in Ghana. Fast delivery, competitive prices.',
    phone: '+233 24 123 4567',
    email: 'store@flashdata.gh',
    address: 'Accra, Ghana',
    bankName: 'GCB Bank',
    accountNumber: '1234567890',
    accountName: 'FlashData Store',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    toast.success('Store settings saved successfully!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Settings</h1>
        <p className="text-muted-foreground">Manage your store profile and payment settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Store Profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Store Profile
            </CardTitle>
            <CardDescription>
              Update your store information visible to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Store Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  FD
                </div>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 200x200px, PNG or JPG
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Bank Details
            </CardTitle>
            <CardDescription>
              For receiving withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Select
                value={formData.bankName}
                onValueChange={(value) => setFormData({ ...formData, bankName: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2" size="lg">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </motion.div>
  )
}
