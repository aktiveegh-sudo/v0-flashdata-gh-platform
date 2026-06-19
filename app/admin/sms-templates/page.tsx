'use client'

import { useState } from 'react'
import { Copy, Download, MessageSquare, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { toCsv } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type SmsTemplate = {
  id: string
  name: string
  key: string
  body: string
}

const DEFAULT_TEMPLATES: SmsTemplate[] = [
  { id: '1', name: 'Order Delivered', key: 'order_delivered', body: 'Hi {{name}}, your {{network}} {{amount}} order has been delivered. Ref: {{reference}}' },
  { id: '2', name: 'Wallet Top-up', key: 'wallet_topup', body: 'Your wallet has been credited with GHS {{amount}}. New balance: GHS {{balance}}' },
  { id: '3', name: 'Order Pending', key: 'order_pending', body: 'Your order {{reference}} for {{amount}} is being processed. We will notify you shortly.' },
]

export default function AdminSmsTemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>(DEFAULT_TEMPLATES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [body, setBody] = useState('')

  const startCreate = () => {
    setEditingId(null)
    setName('')
    setKey('')
    setBody('')
  }

  const startEdit = (tpl: SmsTemplate) => {
    setEditingId(tpl.id)
    setName(tpl.name)
    setKey(tpl.key)
    setBody(tpl.body)
  }

  const saveTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !key.trim() || !body.trim()) {
      toast.error('Fill in all fields')
      return
    }
    if (editingId) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, name: name.trim(), key: key.trim(), body: body.trim() } : t))
      )
      toast.success('Template updated')
    } else {
      setTemplates((prev) => [
        { id: crypto.randomUUID(), name: name.trim(), key: key.trim(), body: body.trim() },
        ...prev,
      ])
      toast.success('Template created')
    }
    startCreate()
  }

  const copyBody = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success('Template copied')
  }

  const exportCsv = () => {
    const csv = toCsv(templates.map((t) => ({ name: t.name, key: t.key, body: t.body })))
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flashdata-sms-templates-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminPageShell
      title="SMS Templates"
      description="Manage SMS notification templates with variable placeholders."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!templates.length}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Templates" value={String(templates.length)} icon={MessageSquare} />
          <AdminStatCard label="Variables" value="{{name}}, {{amount}}, etc." hint="Use double-brace placeholders" />
        </AdminStatGrid>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title={editingId ? 'Edit Template' : 'Create Template'}>
          <form onSubmit={saveTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Order Delivered" />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="order_delivered" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Hi {{name}}, ..." />
            </div>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {editingId ? 'Update' : 'Create'}
            </Button>
          </form>
        </AdminPanel>

        <AdminPanel title="Template Library">
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-gray-100 p-4 dark:border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                    <p className="font-mono text-xs text-amber-600 dark:text-amber-400">{tpl.key}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => void copyBody(tpl.body)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(tpl)}>
                      Edit
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-white/60">{tpl.body}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}
