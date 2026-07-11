'use client'

import { useEffect, useState } from 'react'
import { BellRing, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react'
import { AdminPageShell } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type NotificationRow = {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  created_at: string
  profiles?: { full_name: string | null; phone: string | null } | null
}

export default function AdminSendNotificationPage() {
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [target, setTarget] = useState<'all' | 'selected'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [sendInApp, setSendInApp] = useState(true)
  const [sendSms, setSendSms] = useState(true)

  const loadData = async () => {
    setLoading(true)

    await supabase.client.rpc('sync_auth_users_to_profiles_wallets')

    const [usersRes, notificationsRes] = await Promise.all([
      supabase.client.from('profiles').select('id,full_name,phone').order('created_at', { ascending: false }),
      supabase.client
        .from('notifications')
        .select('id,user_id,title,message,type,created_at,profiles(full_name,phone)')
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (usersRes.error) {
      toast.error(usersRes.error.message)
      setLoading(false)
      return
    }

    if (notificationsRes.error) {
      toast.error(notificationsRes.error.message)
      setLoading(false)
      return
    }

    setUsers((usersRes.data as ProfileRow[]) || [])
    setRows((notificationsRes.data as NotificationRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()

    const channel = supabase.client
      .channel('admin-notifications-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void loadData())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const toggleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUserIds((current) => {
      if (checked) {
        return current.includes(userId) ? current : [...current, userId]
      }
      return current.filter((id) => id !== userId)
    })
  }

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      toast.error('Message is required')
      return
    }

    if (!sendInApp && !sendSms) {
      toast.error('Enable in-app notification or SMS')
      return
    }

    if (target === 'selected' && selectedUserIds.length === 0) {
      toast.error('Select at least one user')
      return
    }

    setSending(true)

    if (editingId) {
      const targetUserId = selectedUserIds[0] || ''
      if (!targetUserId) {
        toast.error('Please select a user for this notification')
        setSending(false)
        return
      }

      const { error } = await supabase.client
        .from('notifications')
        .update({
          user_id: targetUserId,
          title: title.trim() || 'FlashData GH',
          message: message.trim(),
          type,
        })
        .eq('id', editingId)

      if (error) {
        toast.error(error.message)
        setSending(false)
        return
      }

      toast.success('Notification updated')
      setSending(false)
      cancelEdit()
      void loadData()
      return
    }

    try {
      const headers = await getAdminAuthHeaders()
      const response = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: target,
          userIds: target === 'selected' ? selectedUserIds : undefined,
          title: title.trim() || 'FlashData GH',
          message: message.trim(),
          type,
          sendInApp,
          sendSms,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: { targetedUsers?: number; inAppSent?: number; smsSent?: number; smsFailed?: number; smsSkipped?: number }
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to send notification')
      }

      const summary = payload.data
      toast.success(
        `Sent to ${summary?.targetedUsers || 0} user(s)` +
          (sendSms
            ? ` · SMS: ${summary?.smsSent || 0} sent, ${summary?.smsFailed || 0} failed, ${summary?.smsSkipped || 0} skipped`
            : '')
      )

      setTitle('')
      setMessage('')
      setSelectedUserIds([])
      void loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send notification')
    } finally {
      setSending(false)
    }
  }

  const editNotification = (row: NotificationRow) => {
    setEditingId(row.id)
    setTarget('selected')
    setSelectedUserIds([row.user_id])
    setTitle(row.title)
    setMessage(row.message)
    setType(row.type)
    setSendInApp(true)
    setSendSms(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setTarget('all')
    setSelectedUserIds([])
    setTitle('')
    setMessage('')
    setType('info')
    setSendInApp(true)
    setSendSms(true)
  }

  const deleteNotification = async (id: string) => {
    if (!window.confirm('Delete this notification?')) {
      return
    }

    const { error } = await supabase.client.from('notifications').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Notification deleted')
    if (editingId === id) {
      cancelEdit()
    }
    void loadData()
  }

  return (
    <AdminPageShell
      title="Send Notification"
      description="Send in-app alerts and SMS to all users or selected users."
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Notification' : 'Create Notification'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendNotification} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={target} onValueChange={(value) => setTarget(value as typeof target)} disabled={Boolean(editingId)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="selected">Selected Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {target === 'selected' ? (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Select Users</Label>
                  <p className="text-xs text-muted-foreground">{selectedUserIds.length} selected</p>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2">
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => toggleUserSelection(user.id, checked === true)}
                      />
                      <span className="text-sm">
                        {user.full_name || 'Unnamed User'}
                        {user.phone ? <span className="text-muted-foreground"> · {user.phone}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="FlashData GH update" />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." />
            </div>

            {!editingId ? (
              <div className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">In-app notification</p>
                    <p className="text-xs text-muted-foreground">Show inside user dashboards</p>
                  </div>
                  <Switch checked={sendInApp} onCheckedChange={setSendInApp} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      SMS message
                    </p>
                    <p className="text-xs text-muted-foreground">Send via TxtConnect to saved phone numbers</p>
                  </div>
                  <Switch checked={sendSms} onCheckedChange={setSendSms} />
                </div>
              </div>
            ) : null}

            <Button type="submit" disabled={sending} className="w-fit min-h-11">
              <Send className="mr-2 h-4 w-4" />{' '}
              {sending ? (editingId ? 'Updating...' : 'Sending...') : editingId ? 'Update Notification' : 'Send Notification'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" className="w-fit" onClick={cancelEdit}>
                Cancel Edit
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications found.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{row.title}</p>
                    <Badge variant="outline">{row.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
                    <Button size="sm" variant="outline" onClick={() => editNotification(row)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void deleteNotification(row.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm">{row.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recipient: {row.profiles?.full_name || 'Unknown'} {row.profiles?.phone ? `(${row.profiles.phone})` : ''}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
