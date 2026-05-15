'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type ServiceRow = {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  image_url: '',
}

export default function AdminAddServicePage() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)

  const loadServices = async () => {
    setLoading(true)
    const { data, error } = await supabase.client
      .from('online_services')
      .select('id,name,description,category,price,image_url,is_active,created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setRows((data as ServiceRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadServices()
  }, [])

  const onUploadImage = async (file: File) => {
    setUploading(true)

    const ext = file.name.split('.').pop() || 'png'
    const filePath = `services/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.client.storage.from('service-images').upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    })

    if (uploadError) {
      setUploading(false)
      toast.error(uploadError.message)
      return
    }

    const { data } = supabase.client.storage.from('service-images').getPublicUrl(filePath)
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }))
    setUploading(false)
    toast.success('Image uploaded')
  }

  const submitService = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      price: Number(form.price),
      image_url: form.image_url || null,
      is_active: true,
    }

    if (!payload.name || Number.isNaN(payload.price)) {
      toast.error('Name and valid price are required')
      return
    }

    if (editingId) {
      const { error } = await supabase.client.from('online_services').update(payload).eq('id', editingId)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Service updated')
    } else {
      const { error } = await supabase.client.from('online_services').insert(payload)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Service created')
    }

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
      price: String(row.price || ''),
      image_url: row.image_url || '',
    })
  }

  const deleteService = async (id: string) => {
    if (!window.confirm('Delete this service?')) {
      return
    }

    const { error } = await supabase.client.from('online_services').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
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
              <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Price (GHS)</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." />
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
                <p className="text-sm">Price: <span className="font-medium">GHS {row.price.toFixed(2)}</span></p>
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
