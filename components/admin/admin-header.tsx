'use client'

import { useEffect, useState } from 'react'
import { Bell, Search, ShieldCheck, WalletMinimal } from 'lucide-react'
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
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-white/10 bg-[#070c14]/92 px-4 py-3 backdrop-blur-xl lg:px-6">
      <form className="hidden flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input placeholder="Quick Search..." className="h-11 border-white/10 bg-[#0d111b] pl-10 text-slate-100 shadow-sm placeholder:text-slate-500" />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-400">⌘K</span>
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f4c532]/45 bg-[#f4c532]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f4c532]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-200">
            <WalletMinimal className="h-3.5 w-3.5 text-[#f4c532]" />
            Admin
          </div>
        </div>

        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative h-11 w-11 rounded-xl border-white/10 bg-white/5 text-slate-100 shadow-sm hover:bg-white/10">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f4c532] px-1 text-[10px] font-bold text-black">
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
            <Button type="button" variant="outline" className="h-11 gap-2 rounded-xl border-white/10 bg-white/5 px-2 text-slate-100 shadow-sm hover:bg-white/10 sm:px-3">
              <Avatar className="h-7 w-7 ring-2 ring-[#f4c532]/40">
                <AvatarFallback className="bg-gradient-to-br from-[#f4c532] to-[#d4a617] text-[#1b1207]">{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
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
