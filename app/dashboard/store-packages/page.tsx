'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, Package, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useStorePackageStore } from '@/lib/store'
import toast from 'react-hot-toast'

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500 text-black',
  'Airtel-Tigo': 'bg-red-500 text-white',
  Telecel: 'bg-blue-600 text-white',
}

export default function StorePackagesPage() {
  const { packages, addPackage, updatePackage, deletePackage } = useStorePackageStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<typeof packages[0] | null>(null)
  
  const [formData, setFormData] = useState({
    network: '',
    dataAmount: '',
    costPrice: '',
    sellingPrice: '',
  })

  const resetForm = () => {
    setFormData({
      network: '',
      dataAmount: '',
      costPrice: '',
      sellingPrice: '',
    })
    setEditingPackage(null)
  }

  const handleOpenDialog = (pkg?: typeof packages[0]) => {
    if (pkg) {
      setEditingPackage(pkg)
      setFormData({
        network: pkg.network,
        dataAmount: pkg.dataAmount,
        costPrice: pkg.costPrice.toString(),
        sellingPrice: pkg.sellingPrice.toString(),
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.network || !formData.dataAmount || !formData.costPrice || !formData.sellingPrice) {
      toast.error('Please fill in all fields')
      return
    }

    const packageData = {
      network: formData.network,
      dataAmount: formData.dataAmount,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      active: true,
    }

    if (editingPackage) {
      updatePackage(editingPackage.id, packageData)
      toast.success('Package updated successfully!')
    } else {
      addPackage(packageData)
      toast.success('Package added successfully!')
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    deletePackage(id)
    toast.success('Package deleted successfully!')
  }

  const handleToggleActive = (id: string, active: boolean) => {
    updatePackage(id, { active })
    toast.success(`Package ${active ? 'activated' : 'deactivated'}`)
  }

  const profit = (sellingPrice: number, costPrice: number) => {
    return sellingPrice - costPrice
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Data Packages</h1>
          <p className="text-muted-foreground">Manage the data packages you sell in your store</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Package' : 'Add New Package'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? 'Update the package details below'
                  : 'Fill in the details to add a new data package'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Network</Label>
                <Select
                  value={formData.network}
                  onValueChange={(value) => setFormData({ ...formData, network: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Airtel-Tigo">Airtel-Tigo</SelectItem>
                    <SelectItem value="Telecel">Telecel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataAmount">Data Amount</Label>
                <Input
                  id="dataAmount"
                  placeholder="e.g., 2GB, 5GB, 10GB"
                  value={formData.dataAmount}
                  onChange={(e) => setFormData({ ...formData, dataAmount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price (GH₵)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price (GH₵)</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  />
                </div>
              </div>
              {formData.costPrice && formData.sellingPrice && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Profit per sale:{' '}
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      GH₵ {profit(parseFloat(formData.sellingPrice), parseFloat(formData.costPrice)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingPackage ? 'Update Package' : 'Add Package'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            All Packages ({packages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Data Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Cost Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Selling Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No packages yet. Add your first package!
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr
                      key={pkg.id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Badge className={networkColors[pkg.network] || 'bg-primary'}>
                          {pkg.network}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{pkg.dataAmount}</td>
                      <td className="px-4 py-3">GH₵ {pkg.costPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold">GH₵ {pkg.sellingPrice.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          GH₵ {profit(pkg.sellingPrice, pkg.costPrice).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pkg.active}
                            onCheckedChange={(checked) => handleToggleActive(pkg.id, checked)}
                          />
                          <span className={pkg.active ? 'text-green-600' : 'text-muted-foreground'}>
                            {pkg.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(pkg)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Package</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this package? This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(pkg.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {packages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No packages yet. Add your first package!
              </div>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className={networkColors[pkg.network] || 'bg-primary'}>
                        {pkg.network}
                      </Badge>
                      <p className="mt-2 text-xl font-bold text-foreground">{pkg.dataAmount}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(pkg)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Package</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this package?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(pkg.id)}
                              className="bg-destructive"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">GH₵ {pkg.costPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sell</p>
                      <p className="font-semibold">GH₵ {pkg.sellingPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className="font-semibold text-green-600">
                        GH₵ {profit(pkg.sellingPrice, pkg.costPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pkg.active}
                        onCheckedChange={(checked) => handleToggleActive(pkg.id, checked)}
                      />
                      <span className={pkg.active ? 'text-green-600' : 'text-muted-foreground'}>
                        {pkg.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
