'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardPageShell, DashboardPanel } from '@/components/dashboard/page-shell'
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

  const unreadCount = items.filter((item) => !item.is_read).length

  return (
    <DashboardPageShell
      title="Notifications"
      description="Stay updated on orders, wallet activity, and account alerts."
      actions={
        <Button variant="outline" onClick={() => void markAllRead()} className="gap-2" disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      }
    >
      <DashboardPanel
        title="Recent Alerts"
        description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">Loading notifications...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-amber-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                      {!item.is_read ? <Badge className="bg-amber-400 text-black">New</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-white/65">{item.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-white/40">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
