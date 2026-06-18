'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

type NotificationItem = {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase.client
      .from('notifications')
      .select('id,title,message,created_at,is_read')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setItems((data as NotificationItem[] | null) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const markAllRead = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id)
    if (!userId || unreadIds.length === 0) return

    const { error } = await supabase.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', unreadIds)

    if (error) {
      toast.error(error.message)
      return
    }

    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })))
    toast.success('All notifications marked as read')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white lg:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">Stay updated on orders, wallet activity, and account alerts.</p>
        </div>
        <Button variant="outline" onClick={() => void markAllRead()} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-amber-400" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading notifications...</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{item.title}</p>
                        {!item.is_read ? <Badge className="bg-amber-400 text-black">New</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{item.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
