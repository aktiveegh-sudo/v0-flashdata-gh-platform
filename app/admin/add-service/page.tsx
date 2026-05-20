'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type ServiceRow = {
  id: string
  name: string
  description: string | null
  category: string | null
  public_price: number
  agent_price: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

const emptyForm = {
  name: '',
  description: '',
  category: 'General',
  public_price: '',
  agent_price: '',
  image_url: '',
  is_active: true,
}

export default function AdminAddServicePage() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)

  const loadServices = async () => {
    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''

    const response = await fetch('/api/admin/services', {
      method: 'GET',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: ServiceRow[]; error?: string }
      | null

    if (!response.ok || !payload?.success) {
      toast.error(payload?.error || 'Unable to load services')
      setLoading(false)
      return
    }

    setRows(payload.data || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadServices()
  }, [])

  const onUploadImage = async (file: File) => {
    setUploading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/admin/storage/upload-service-image', {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: { publicUrl?: string }; error?: string }
      | null

    if (!response.ok || !payload?.success || !payload?.data?.publicUrl) {
      setUploading(false)
      toast.error(payload?.error || 'Unable to upload image')
      return
    }

    setForm((prev) => ({ ...prev, image_url: payload.data?.publicUrl || '' }))
    setUploading(false)
    toast.success('Image uploaded')
  }

  const submitService = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedName = form.name.trim()
    const normalizedCategory = form.category.trim() || 'General'
    const parsedPublicPrice = Number(form.public_price)
    const parsedAgentPrice = Number(form.agent_price)

    const payload = {
      name: normalizedName,
      description: form.description.trim() || null,
      category: normalizedCategory,
      public_price: parsedPublicPrice,
      agent_price: parsedAgentPrice,
      image_url: form.image_url || null,
      is_active: form.is_active,
    }

    if (!payload.name || Number.isNaN(payload.public_price) || Number.isNaN(payload.agent_price) || payload.public_price < 0 || payload.agent_price < 0) {
      toast.error('Name and valid public/agent prices are required')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''

    const response = await fetch('/api/admin/services', {
      method: editingId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    })

    const result = (await response.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null

    if (!response.ok || !result?.success) {
      toast.error(result?.error || 'Unable to save service')
      return
    }

    toast.success(editingId ? 'Service updated' : 'Service created')

    setEditingId(null)
    setForm(emptyForm)
    void loadServices()
  }

  const editService = (row: ServiceRow) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      public_price: String(row.public_price || ''),
      agent_price: String(row.agent_price || ''),
      image_url: row.image_url || '',
      is_active: row.is_active,
    })
  }

  const deleteService = async (id: string) => {
    if (!window.confirm('Delete this service?')) {
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''

    const response = await fetch('/api/admin/services', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ id }),
    })

    const result = (await response.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null

    if (!response.ok || !result?.success) {
      toast.error(result?.error || 'Unable to delete service')
      return
    }

    toast.success('Service deleted')
    void loadServices()
  }

  const previewUrl = useMemo(() => form.image_url || '', [form.image_url])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Service</h1>
        <p className="text-sm text-muted-foreground">Manage online services with image upload and instant preview.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Service' : 'Create Service'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitService} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Utility, Entertainment"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>User Price (GHS)</Label>
              <Input type="number" min="0" step="0.01" value={form.public_price} onChange={(e) => setForm((prev) => ({ ...prev, public_price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Agent Price (GHS)</Label>
              <Input type="number" min="0" step="0.01" value={form.agent_price} onChange={(e) => setForm((prev) => ({ ...prev, agent_price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 md:col-span-2">
              <div>
                <p className="text-sm font-medium">Active for Checkout</p>
                <p className="text-xs text-muted-foreground">Visible on public and agent pages</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Upload image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    void onUploadImage(file)
                  }
                }}
              />
              {uploading && <p className="text-sm text-muted-foreground">Uploading image...</p>}
            </div>

            {previewUrl && (
              <div className="md:col-span-2 rounded-xl border border-border p-3">
                <p className="mb-2 text-sm font-medium">Preview</p>
                <img src={previewUrl} alt="Service preview" className="h-40 w-full rounded-lg object-cover" />
              </div>
            )}

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit">
                {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingId ? 'Save Changes' : 'Create Service'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
                  Cancel Edit
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Select File
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Catalog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services found.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-4">
                {row.image_url ? (
                  <img src={row.image_url} alt={row.name} className="mb-3 h-36 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 h-36 w-full rounded-lg bg-muted" />
                )}
                <h3 className="font-semibold">{row.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{row.description || 'No description'}</p>
                <p className="mt-2 text-sm">Category: <span className="font-medium">{row.category || '-'}</span></p>
                <p className="text-sm">User Price: <span className="font-medium">GHS {row.public_price.toFixed(2)}</span></p>
                <p className="text-sm">Agent Price: <span className="font-medium">GHS {row.agent_price.toFixed(2)}</span></p>
                <p className="text-sm">Status: <span className="font-medium">{row.is_active ? 'Active' : 'Inactive'}</span></p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => editService(row)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void deleteService(row.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
