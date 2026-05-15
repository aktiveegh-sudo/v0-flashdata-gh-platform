'use client'

import { useEffect, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/admin/utils'

interface AdminHeaderProps {
  userName: string
  userEmail: string
  onLogout: () => void
}

type NotificationRow = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}

export function AdminHeader({ userName, userEmail, onLogout }: AdminHeaderProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  useEffect(() => {
    const loadNotifications = async () => {
      const { data } = await supabase.client
        .from('notifications')
        .select('id,title,message,type,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications((data as NotificationRow[]) || [])
    }

    void loadNotifications()

    const channel = supabase.client
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void loadNotifications()
      })
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
      <form className="hidden flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users, orders, packages..." className="h-11 pl-10" />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative h-11 w-11">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[92vw] max-w-sm">
            <DropdownMenuLabel>Realtime Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem className="text-muted-foreground">No notifications yet.</DropdownMenuItem>
            ) : (
              notifications.slice(0, 6).map((item) => (
                <DropdownMenuItem key={item.id} className="block py-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(item.created_at)}</p>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-11 gap-2 px-2 sm:px-3">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-36 truncate text-sm sm:inline">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <p className="font-medium">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
